'use strict';
// Streaming character voice: pitch/formants +32%, unchanged speaking duration.
globalThis.BatCharacterVoice=class {
 constructor(){this.reset();}
 reset(){this.dsp=new BatSoundTouch();this.dsp.pitch=1.32;this.dsp.tempo=1;this.dsp.stretch.setParameters(24000,82,28,12);this.input=0;this.output=0;}
 drain(){const count=Math.min(this.dsp.outputBuffer.frameCount,this.input-this.output);if(count<=0)return null;const stereo=new Float32Array(count*2);this.dsp.outputBuffer.receiveSamples(stereo,count);const mono=new Int16Array(count);for(let i=0;i<count;i++)mono[i]=Math.round(Math.max(-.89,Math.min(.89,stereo[i*2]))*32767);this.output+=count;return mono;}
 push(pcm){const stereo=new Float32Array(pcm.length*2);for(let i=0;i<pcm.length;i++)stereo[i*2]=stereo[i*2+1]=pcm[i]/32768;this.input+=pcm.length;this.dsp.inputBuffer.putSamples(stereo,0,pcm.length);this.dsp.process();return this.drain();}
 finish(){this.dsp.inputBuffer.putSamples(new Float32Array(24000),0,12000);this.dsp.process();const tail=this.drain();this.reset();return tail;}
};

