import wave, struct, math, random
SR=44100
def write(name, samples):
    with wave.open(name,'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1,min(1,s))*32000)) for s in samples))
# soft click: short filtered noise burst + tiny tone
random.seed(3); click=[]; lp=0
for i in range(int(SR*0.05)):
    t=i/SR; env=math.exp(-t*140)
    lp=lp*0.6+random.uniform(-1,1)*0.4
    click.append(0.35*env*lp + 0.25*env*math.sin(2*math.pi*1900*t))
write('public/audio/click.wav', click)
# chime E5 -> B5 (ascending fifth), bell-ish
def bell(f, t): return math.sin(2*math.pi*f*t)+0.35*math.sin(2*math.pi*f*2.01*t)+0.12*math.sin(2*math.pi*f*3.0*t)
ch=[]
for i in range(int(SR*1.6)):
    t=i/SR; s=0
    s+=0.28*math.exp(-t*3.2)*bell(659.25,t)
    if t>0.14: s+=0.30*math.exp(-(t-0.14)*2.6)*bell(987.77,t-0.14)
    a=min(1,t/0.004); ch.append(s*a*0.8)
write('public/audio/chime.wav', ch)
# low whoosh/swell for reveal: filtered noise rising then falling
wh=[]; lp=0
n=int(SR*1.8)
for i in range(n):
    t=i/SR; env=math.sin(math.pi*min(1,t/1.8))**2
    c=0.02+0.10*(t/1.8)
    lp=lp*(1-c)+random.uniform(-1,1)*c
    wh.append(lp*env*2.2)
write('public/audio/whoosh.wav', wh)
