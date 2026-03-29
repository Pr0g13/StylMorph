import json
import io

nb_path = r"c:\Users\sanju\myd\prjgrp\StylMorph\fashn-vton\fashion2dtryon.ipynb"

with open(nb_path, "r", encoding="utf-8") as f:
    text = f.read()

# Fix decoding by trimming extra data
last_brace = text.rfind('}')
if last_brace != -1:
    text = text[:last_brace+1]

nb = json.loads(text)

modified = False
for cell in nb["cells"]:
    source_lines = cell.get("source", [])
    if any("API ENDPOINT THAT QUEUES YOUR TRY-ON JOB" in s for s in source_lines):
        full_source = "".join(source_lines)
        
        target = "data = request.json"
        if "if 'job_id' in data:" in full_source:
             print("Already modified")
             modified = True
             break
             
        if target in full_source:
            new_code = """data = request.json

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'job_id' in data:
            # Check status of an existing job
            job_id = data['job_id']
            if job_id not in jobs:
                return jsonify({'success': False, 'error': 'Job not found'}), 404
            
            job = jobs[job_id]
            status = job['status']
            
            response = {
                'success': True,
                'job_id': job_id,
                'status': status
            }
            
            if status == 'completed':
                response['result_image'] = job['result_image']
                response['result_filename'] = job['result_filename']
                response['processing_time'] = job['processing_time']
                response['message'] = "Processed successfully"
                response['category'] = job.get('category', 'tops')
            elif status == 'failed':
                response['error'] = job.get('error', 'Unknown error')
                
            return jsonify(response)"""

            import re
            pattern = re.compile(r"data\s*=\s*request\.json\n\n\s*if not data:\n\s*return jsonify\(\{'error': 'No data provided'\}\), 400")
            
            if pattern.search(full_source):
                full_source = pattern.sub(new_code, full_source)
                
                new_source_lines = []
                for line in io.StringIO(full_source):
                    new_source_lines.append(line)
                cell["source"] = new_source_lines
                print("Successfully modified cell source via regex.")
                modified = True
            else:
                print("Regex pattern not found in the cell.")
        else:
            print("Target 'data = request.json' not found in the cell.")
        break

if modified:
    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Notebook saved successfully.")
else:
    print("No modifications were made.")
