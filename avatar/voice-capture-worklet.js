class BatMicProcessor extends AudioWorkletProcessor{
 constructor(){super();this.phase=0;this.buffer=[];}
 process(inputs,outputs){const channels=inputs[0];if(!channels?.length)return true;const samples=channels[0],step=sampleRate/24000;
 while(this.phase<samples.length){const i=Math.floor(this.phase),value=Math.max(-1,Math.min(1,samples[i]||0));this.buffer.push(Math.round(value*(value<0?32768:32767)));this.phase+=step;
 if(this.buffer.length===2400){const pcm=new Int16Array(this.buffer);this.port.postMessage(pcm.buffer,[pcm.buffer]);this.buffer=[];}}
 this.phase-=samples.length;return true;}
}registerProcessor('bat-mic',BatMicProcessor);
