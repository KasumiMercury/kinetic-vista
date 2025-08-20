#!/bin/bash

set -eu
set -o pipefail

if [ "$#" -eq 0 ]; then
    exit 1
fi

for file in "$@"; do
    if [ ! -f "$file" ]; then
        echo "No such file: $file" >&2
        continue
    fi

    echo "Processing: $file"

    sed -i.bak \
        -e "/import \* as THREE from 'three'/,/import { GLTF } from 'three-stdlib'/c\
import { useGLTF } from '@react-three/drei'\\
import type {JSX} from 'react'\\
import type * as THREE from 'three'\\
import type { GLTF } from 'three-stdlib'" \
        -e 's/^\(\s*\)\(materials: .*\)/\1\/\/ \2/' \
        -e 's/^\(\s*\)\(animations: .*\)/\1\/\/ \2/' \
        -e "s/const { nodes, materials } = useGLTF(\(.*\)) as GLTFResult/const { nodes } = useGLTF(\1) as unknown as GLTFResult/" \
        -e '/<mesh/ { :a; / *\/>/! { N; ba; }; s/ *\/>/\><\/mesh>/; }' \
        "$file"

    echo "Completed: $file (Backup: ${file}.bak)"
done

echo "All files processed successfully."
