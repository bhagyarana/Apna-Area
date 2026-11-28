import sys, glob, os
from PIL import Image, ImageDraw
files = sys.argv[2:]
out = sys.argv[1]
cols = int(os.environ.get("COLS","4")); w = 640; h = 360
rows = (len(files)+cols-1)//cols
sheet = Image.new("RGB", (cols*w, rows*(h+22)), "white")
d = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(f).convert("RGB"); im.thumbnail((w,h))
    x=(i%cols)*w; y=(i//cols)*(h+22)
    sheet.paste(im,(x,y+22)); d.text((x+4,y+4), os.path.basename(f), fill="black")
sheet.save(out)
