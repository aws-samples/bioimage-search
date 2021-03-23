#!/usr/bin/env bash
/usr/bin/python3 fsxl-helper.py | { read a; aws fsx update-file-system --file-system-id $a --lustre-configuration AutoImportPolicy=NEW_CHANGED; } > fsxl-status.out &
