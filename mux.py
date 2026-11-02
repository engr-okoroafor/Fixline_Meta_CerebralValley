import json,subprocess,glob,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
d=json.load(open('starts.json'));S=d['starts'];cuts=d['cuts'];order=[k for k,_ in json.load(open('durations.json'))]
raw=glob.glob('raw/*.webm')[0]
# offset: page video starts before t0; estimate via raw duration minus end
rd=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",raw]))
off=rd-d['end']-0.3
L=open('list.txt','w')
for i,k in enumerate(order):
    a=S[k]; b=S[order[i+1]] if i+1<len(order) else d['end']
    segs=[];cur=a
    for c0,c1 in cuts:
        if c0>=a and c1<=b: segs.append((cur,c0)); cur=c1
    segs.append((cur,b))
    sel="+".join(f"between(t,{x+off:.3f},{y+off:.3f})" for x,y in segs)
    vd=sum(y-x for x,y in segs)
    ad=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{i:02d}.mp3"]))+0.3
    T=max(vd,ad)
    subprocess.run(["ffmpeg","-y","-v","error","-i",raw,"-i",f"{i:02d}.mp3","-filter_complex",
      f"[0:v]select='{sel}',setpts=N/FRAME_RATE/TB,fps=30,tpad=stop_mode=clone:stop_duration=5,trim=0:{T:.3f},setpts=PTS-STARTPTS[v];[1:a]adelay=300|300,apad,atrim=0:{T:.3f}[a]",
      "-map","[v]","-map","[a]","-c:v","libx264","-preset","fast","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-ar","48000","-ac","2",f"clip{i:02d}.mp4"],check=True)
    L.write(f"file 'clip{i:02d}.mp4'\n");print(k,round(vd,1),round(ad,1))
L.close()
subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i","list.txt","-c","copy","-movflags","+faststart","../fixline-guardian-features-sell-demo.mp4"],check=True)
