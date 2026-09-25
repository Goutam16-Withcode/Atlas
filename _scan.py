with open('static/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "querySelector('i" in line or 'querySelector("i' in line or "data-lucide" in line:
        if "setAttribute" in line:
            print(f"{idx}: {line.strip()}")
