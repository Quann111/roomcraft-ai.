import zipfile,re,json,html,sys
z=zipfile.ZipFile(r"C:\Users\ADMIN\Downloads\1\Styles & Promts.xlsx")
ss=[html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>",si,re.S))) for si in re.findall(r"<si>(.*?)</si>",z.read("xl/sharedStrings.xml").decode("utf8"),re.S)]
sheet=z.read("xl/worksheets/sheet1.xml").decode("utf8")
rows={}
for m in re.finditer(r'<c r="([A-Z]+)(\d+)"([^>]*?)(?:/>|>(.*?)</c>)',sheet,re.S):
    col,row,attrs,body=m.groups()
    if col not in "AB" or not body: continue
    v=re.search(r"<v>(.*?)</v>",body)
    if not v: continue
    val=ss[int(v.group(1))] if 't="s"' in attrs else v.group(1)
    rows.setdefault(int(row),{})[col]=val.strip()
out=[]
for r in sorted(rows):
    d=rows[r]
    if r==1 or "A" not in d or "B" not in d: continue
    slug=re.sub(r"[^a-z0-9]+","-",d["A"].lower()).strip("-")
    out.append({"slug":slug,"name":d["A"],"scope":"interior","prompt":d["B"]})
json.dump(out,open("seed/styles.json","w",encoding="utf8"),ensure_ascii=False,indent=1)
print(len(out),[o["name"] for o in out])
