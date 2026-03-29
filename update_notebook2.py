import json
import io
import re

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
    if any("API ENDPOINT THAT QUEUES YOUR TRY-ON JOB" in s for s in source_lines) or any("CREATE FLASK APP" in s for s in source_lines):
        full_source = "".join(source_lines)
        
        # We want to remove `num_inference_steps=15`
        # It looks like:
        # custom_result = pipeline(
        #     person_image=custom_person,
        #     garment_image=custom_garment,
        #     category=category,
        #     num_inference_steps=15
        # )
        
        # Regex to remove `num_inference_steps=...`
        new_source = re.sub(r",\s*num_inference_steps=\d+", "", full_source)
        new_source = re.sub(r"num_inference_steps=\d+\s*", "", new_source)
        
        if new_source != full_source:
            new_source_lines = []
            for line in io.StringIO(new_source):
                new_source_lines.append(line)
            cell["source"] = new_source_lines
            print("Successfully removed num_inference_steps from cell source.")
            modified = True
            break
        else:
            print("num_inference_steps not found in this cell, checking next...")

if modified:
    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print("Notebook saved successfully.")
else:
    print("No modifications were made. Could not find num_inference_steps.")
