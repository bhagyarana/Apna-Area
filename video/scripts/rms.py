import sys, wave, struct, math
for f in sys.argv[1:]:
    w=wave.open(f); n=w.getnframes(); ch=w.getnchannels(); sw=w.getsampwidth()
    data=w.readframes(n); vals=struct.unpack('<%dh'%(len(data)//2), data)
    rms=math.sqrt(sum(v*v for v in vals)/len(vals))/32768; pk=max(abs(v) for v in vals)/32768
    print(f, 'rms dBFS %.1f'%(20*math.log10(rms+1e-9)), 'peak %.1f'%(20*math.log10(pk+1e-9)))
