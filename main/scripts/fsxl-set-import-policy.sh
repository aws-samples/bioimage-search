#!/usr/bin/env bash
python fsxl-helper.py | { read a; aws fsx update-file-system --file-system-id $a --lustre-configuration AutoImportPolicy=NEW_CHANGED; }
