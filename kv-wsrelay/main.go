package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// Message types exchanged over WebSocket
type WelcomeMessage struct {
	Type   string `json:"type"`
	UserID string `json:"userId"`
	Color  string `json:"color"`
}

type IncomingMessage struct {
	Type        string `json:"type"`
	UserID      string `json:"userId"`
	LandmarkKey string `json:"landmarkKey"`
}

type SelectionBroadcast struct {
	Type        string `json:"type"`
	UserID      string `json:"userId"`
	LandmarkKey string `json:"landmarkKey"`
	Color       string `json:"color"`
}

type SnapshotSelection struct {
	UserID      string `json:"userId"`
	LandmarkKey string `json:"landmarkKey"`
	Color       string `json:"color"`
}

type SnapshotMessage struct {
	Type       string              `json:"type"`
	Selections []SnapshotSelection `json:"selections"`
}

// Client represents a connected user
type Client struct {
	id    string
	color string
	conn  *websocket.Conn
	send  chan []byte
}

// Hub manages WebSocket clients and broadcasts
type Hub struct {
	register   chan *Client
	unregister chan *Client
	broadcast  chan broadcastItem
	clients    map[*Client]bool
}

type broadcastItem struct {
	sender  *Client
	payload []byte
}

func newHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan broadcastItem, 128),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true
		case c := <-h.unregister:
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
		case msg := <-h.broadcast:
			for c := range h.clients {
				if c == msg.sender {
					continue // skip sender per requirements
				}
				select {
				case c.send <- msg.payload:
				default:
					// slow consumer; drop and clean up
					delete(h.clients, c)
					close(c.send)
				}
			}
		}
	}
}

// global redis client
var rdb *redis.Client

func redisClient() *redis.Client {
	if rdb != nil {
		return rdb
	}
	addr := getenv("REDIS_ADDR", "redis:6379")
	pass := os.Getenv("REDIS_PASSWORD")
	db := 0
	rdb = redis.NewClient(&redis.Options{Addr: addr, Password: pass, DB: db})
	return rdb
}

func getenv(k, def string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return def
	}
	return v
}

// generate random hex color like #A1B2C3
func randomHexColor() string {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		// fallback deterministic color if RNG fails
		return "#3399ff"
	}
	return "#" + strings.ToUpper(hex.EncodeToString(b))
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins; front is behind same compose network/Caddy
		return true
	},
}

// ---- CORS middleware ----
type corsConfig struct {
	allowOrigins     []string
	allowMethods     []string
	allowHeaders     []string
	exposeHeaders    []string
	allowCredentials bool
	maxAge           time.Duration
}

func parseListEnv(key, def string) []string {
	v := getenv(key, def)
	parts := []string{}
	for _, p := range strings.Split(v, ",") {
		p = strings.TrimSpace(p)
		if p != "" {
			parts = append(parts, p)
		}
	}
	return parts
}

func loadCORSConfig() corsConfig {
	maxAgeSec := 600
	if s := strings.TrimSpace(os.Getenv("CORS_MAX_AGE")); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n >= 0 {
			maxAgeSec = n
		}
	}
	allowCreds := false
	if s := strings.TrimSpace(os.Getenv("CORS_ALLOW_CREDENTIALS")); s != "" {
		b, err := strconv.ParseBool(s)
		if err == nil {
			allowCreds = b
		}
	}
	return corsConfig{
		allowOrigins:     parseListEnv("CORS_ALLOW_ORIGINS", "*"),
		allowMethods:     parseListEnv("CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS"),
		allowHeaders:     parseListEnv("CORS_ALLOW_HEADERS", "Origin,Content-Type,Accept,Authorization"),
		exposeHeaders:    parseListEnv("CORS_EXPOSE_HEADERS", ""),
		allowCredentials: allowCreds,
		maxAge:           time.Duration(maxAgeSec) * time.Second,
	}
}

func corsMiddleware(cfg corsConfig) gin.HandlerFunc {
	allowAll := len(cfg.allowOrigins) == 1 && cfg.allowOrigins[0] == "*"
	allowMethods := strings.Join(cfg.allowMethods, ", ")
	allowHeaders := strings.Join(cfg.allowHeaders, ", ")
	exposeHeaders := strings.Join(cfg.exposeHeaders, ", ")

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" && c.Request.Method != http.MethodOptions {
			// Non-CORS request
			c.Next()
			return
		}

		// Access-Control-Allow-Origin
		if allowAll && cfg.allowCredentials {
			// Per spec, cannot use '*' with credentials; reflect origin
			if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		} else if allowAll {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			// Check if origin is allowed
			for _, ao := range cfg.allowOrigins {
				if strings.EqualFold(ao, origin) {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		if cfg.allowCredentials {
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		if allowMethods != "" {
			c.Writer.Header().Set("Access-Control-Allow-Methods", allowMethods)
		}
		if allowHeaders != "" {
			c.Writer.Header().Set("Access-Control-Allow-Headers", allowHeaders)
		}
		if exposeHeaders != "" {
			c.Writer.Header().Set("Access-Control-Expose-Headers", exposeHeaders)
		}
		if cfg.maxAge > 0 {
			c.Writer.Header().Set("Access-Control-Max-Age", fmt.Sprintf("%d", int(cfg.maxAge/time.Second)))
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ---- Logging level ----
type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
)

var currentLevel = LevelInfo

func parseLogLevel(s string) LogLevel {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return LevelDebug
	case "info", "":
		return LevelInfo
	case "warn", "warning":
		return LevelWarn
	case "error":
		return LevelError
	default:
		return LevelInfo
	}
}

func debugf(format string, v ...any) {
	if currentLevel <= LevelDebug {
		log.Printf("DEBUG "+format, v...)
	}
}
func infof(format string, v ...any) {
	if currentLevel <= LevelInfo {
		log.Printf("INFO  "+format, v...)
	}
}
func warnf(format string, v ...any) {
	if currentLevel <= LevelWarn {
		log.Printf("WARN  "+format, v...)
	}
}
func errorf(format string, v ...any) {
	if currentLevel <= LevelError {
		log.Printf("ERROR "+format, v...)
	}
}

func wsHandler(h *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			warnf("websocket upgrade error: %v", err)
			return
		}
		// Assign identity and color
		uid := uuid.NewString()
		color := randomHexColor()
		client := &Client{
			id:    uid,
			color: color,
			conn:  conn,
			send:  make(chan []byte, 256),
		}

		// Persist to Redis
		ctx := context.Background()
		rc := redisClient()
		key := fmt.Sprintf("kv:users:%s", uid)
		if err := rc.HSet(ctx, key, map[string]interface{}{
			"color":       color,
			"connectedAt": time.Now().Unix(),
		}).Err(); err != nil {
			warnf("redis HSet error: %v", err)
		}
		if err := rc.SAdd(ctx, "kv:active_users", uid).Err(); err != nil {
			warnf("redis SAdd error: %v", err)
		}

		// Register client on hub
		h.register <- client

		// Send welcome payload to this client
		welcome := WelcomeMessage{Type: "welcome", UserID: uid, Color: color}
		if payload, err := json.Marshal(welcome); err == nil {
			client.send <- payload
		}

		// Send snapshot of current selections to this client
		// Gather all active users' selections
		if members, err := rc.SMembers(ctx, "kv:active_users").Result(); err == nil {
			selections := make([]SnapshotSelection, 0, len(members))
			for _, m := range members {
				k := fmt.Sprintf("kv:users:%s", m)
				vals, err := rc.HGetAll(ctx, k).Result()
				if err != nil || len(vals) == 0 {
					continue
				}
				lk := strings.TrimSpace(vals["landmarkKey"])
				col := strings.TrimSpace(vals["color"])
				if lk == "" || col == "" {
					continue
				}
				selections = append(selections, SnapshotSelection{UserID: m, LandmarkKey: lk, Color: col})
			}
			snap := SnapshotMessage{Type: "snapshot", Selections: selections}
			if payload, err := json.Marshal(snap); err == nil {
				client.send <- payload
			}
		}

		// Start writer and reader goroutines
		go writer(client)
		reader(h, client)

		// On exit of reader: cleanup
		h.unregister <- client
		_ = conn.Close()
		if err := rc.SRem(ctx, "kv:active_users", uid).Err(); err != nil {
			warnf("redis SRem error: %v", err)
		}
		if err := rc.Del(ctx, key).Err(); err != nil {
			warnf("redis DEL error: %v", err)
		}
	}
}

func reader(h *Hub, c *Client) {
	defer func() {
		// ensure closure is handled by caller
	}()
	c.conn.SetReadLimit(1 << 20) // 1MB
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			// connection closed or read error
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				return
			}
			debugf("read error: %v", err)
			return
		}
		// Parse inbound message
		var in IncomingMessage
		if err := json.Unmarshal(message, &in); err != nil {
			debugf("invalid JSON message: %v", err)
			continue
		}
		switch strings.ToLower(in.Type) {
		case "select", "selection":
			// Update Redis and broadcast to others
			ctx := context.Background()
			rc := redisClient()
			key := fmt.Sprintf("kv:users:%s", c.id)
			lk := strings.TrimSpace(in.LandmarkKey)
			if lk == "" {
				// ignore empty selection
				continue
			}
			if err := rc.HSet(ctx, key, map[string]interface{}{
				"landmarkKey": lk,
				"lastUpdated": time.Now().Unix(),
			}).Err(); err != nil {
				warnf("redis HSet selection error: %v", err)
			}
			out := SelectionBroadcast{
				Type:        "selection",
				UserID:      c.id, // enforce server-assigned id
				LandmarkKey: lk,
				Color:       c.color,
			}
			if payload, err := json.Marshal(out); err == nil {
				h.broadcast <- broadcastItem{sender: c, payload: payload}
			}
		case "deselect", "deselection":
			// Clear selection and broadcast deselection
			ctx := context.Background()
			rc := redisClient()
			key := fmt.Sprintf("kv:users:%s", c.id)
			lk := strings.TrimSpace(in.LandmarkKey)
			// Clear the landmarkKey if matches or regardless (we store only one)
			if err := rc.HDel(ctx, key, "landmarkKey").Err(); err != nil {
				warnf("redis HDel deselection error: %v", err)
			}
			if err := rc.HSet(ctx, key, map[string]interface{}{
				"lastUpdated": time.Now().Unix(),
			}).Err(); err != nil {
				warnf("redis HSet lastUpdated error: %v", err)
			}
			out := SelectionBroadcast{
				Type:        "deselection",
				UserID:      c.id,
				LandmarkKey: lk,
				Color:       c.color,
			}
			if payload, err := json.Marshal(out); err == nil {
				h.broadcast <- broadcastItem{sender: c, payload: payload}
			}
		default:
			// ignore unknown types
		}
	}
}

func writer(c *Client) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// channel closed
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func main() {
	// Log level and Gin mode
	currentLevel = parseLogLevel(os.Getenv("LOG_LEVEL"))
	if currentLevel == LevelDebug {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize Gin with adjustable request logging
	router := gin.New()
	router.Use(gin.Recovery())
	if currentLevel <= LevelInfo {
		router.Use(gin.Logger())
	}

	// CORS
	corsCfg := loadCORSConfig()
	router.Use(corsMiddleware(corsCfg))

	// Health check
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// Ensure Redis is reachable early (non-fatal log)
	if err := redisClient().Ping(context.Background()).Err(); err != nil {
		warnf("redis not reachable yet: %v", err)
	}

	// WebSocket hub and route
	hub := newHub()
	go hub.run()
	router.GET("/ws", wsHandler(hub))

	// Run server
	addr := getenv("WSRELAY_ADDR", ":8080")
	if err := router.Run(addr); err != nil {
		errorf("server error: %v", err)
		os.Exit(1)
	}
}
