#!/Users/dsa157/Development/challenges/venv/bin/python3
import sys
import os
import json
import glob

# Workaround for Python 3.13+ where cgi is removed
try:
    import cgi
except ImportError:
    sys.stderr.write("Error: cgi module not found. Try: python3 -m pip install cgi\n")
    sys.exit(1)

# CONFIGURATION - Set your base data path here
BASE_DATA_PATH = '/Users/dsa157/Development/challenges/data'

print("Content-Type: application/json\n")

form = cgi.FieldStorage()
month = form.getvalue('month', 'may').lower()

data = {"success": False}
data_dir = os.path.join(BASE_DATA_PATH, month)

if not os.path.exists(BASE_DATA_PATH):
    data['error'] = f"Base data path not found: {BASE_DATA_PATH}"
elif not os.path.exists(data_dir):
    data['error'] = f"Month directory not found: {data_dir}"
else:
    try:
        for file in glob.glob(os.path.join(data_dir, '*')):
            try:
                with open(file) as f:
                    data[os.path.basename(file)] = f.read().splitlines()
            except PermissionError as e:
                data['error'] = f"Permission error reading files"
                break
        data['success'] = True
    except Exception as e:
        data['error'] = f"Unexpected error: {str(e)}"

print(json.dumps(data))
