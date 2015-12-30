"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
importScripts("../IodineGBA/includes/TypedArrayShim.js");
importScripts("../IodineGBA/core/Cartridge.js");
importScripts("../IodineGBA/core/DMA.js");
importScripts("../IodineGBA/core/Emulator.js");
importScripts("../IodineGBA/core/Graphics.js");
importScripts("../IodineGBA/core/RunLoop.js");
importScripts("../IodineGBA/core/Memory.js");
importScripts("../IodineGBA/core/IRQ.js");
importScripts("../IodineGBA/core/JoyPad.js");
importScripts("../IodineGBA/core/Serial.js");
importScripts("../IodineGBA/core/Sound.js");
importScripts("../IodineGBA/core/Timer.js");
importScripts("../IodineGBA/core/Wait.js");
importScripts("../IodineGBA/core/CPU.js");
importScripts("../IodineGBA/core/Saves.js");
importScripts("../IodineGBA/core/sound/FIFO.js");
importScripts("../IodineGBA/core/sound/Channel1.js");
importScripts("../IodineGBA/core/sound/Channel2.js");
importScripts("../IodineGBA/core/sound/Channel3.js");
importScripts("../IodineGBA/core/sound/Channel4.js");
importScripts("../IodineGBA/core/CPU/ARM.js");
importScripts("../IodineGBA/core/CPU/THUMB.js");
importScripts("../IodineGBA/core/CPU/CPSR.js");
importScripts("../IodineGBA/core/graphics/Renderer.js");
importScripts("../IodineGBA/core/graphics/RendererProxy.js");
importScripts("../IodineGBA/core/graphics/BGTEXT.js");
importScripts("../IodineGBA/core/graphics/BG2FrameBuffer.js");
importScripts("../IodineGBA/core/graphics/BGMatrix.js");
importScripts("../IodineGBA/core/graphics/AffineBG.js");
importScripts("../IodineGBA/core/graphics/ColorEffects.js");
importScripts("../IodineGBA/core/graphics/Mosaic.js");
importScripts("../IodineGBA/core/graphics/OBJ.js");
importScripts("../IodineGBA/core/graphics/OBJWindow.js");
importScripts("../IodineGBA/core/graphics/Window.js");
importScripts("../IodineGBA/core/graphics/Compositor.js");
importScripts("../IodineGBA/core/memory/DMA0.js");
importScripts("../IodineGBA/core/memory/DMA1.js");
importScripts("../IodineGBA/core/memory/DMA2.js");
importScripts("../IodineGBA/core/memory/DMA3.js");
importScripts("../IodineGBA/core/cartridge/SaveDeterminer.js");
importScripts("../IodineGBA/core/cartridge/SRAM.js");
importScripts("../IodineGBA/core/cartridge/FLASH.js");
importScripts("../IodineGBA/core/cartridge/EEPROM.js");
var Iodine = new GameBoyAdvanceEmulator();
//Save callbacks waiting to be satisfied:
var saveImportPool = [];
//Graphics Buffers:
var gfxBuffer = getSharedUint8Array(160 * 240 * 3);
var gfxBuffer2 = getSharedUint8Array(160 * 240 * 3);
var gfxCount = getSharedUint8Array(1);
var gfxLock = getSharedInt32Array(2);
//Audio Buffers:
var audioBuffer = null;
var audioBufferSize = 0;
var audioLock = getSharedInt32Array(2);
var audioMetrics = getSharedInt32Array(2);
//Time Stamp tracking:
var timestamp = getSharedUint32Array(1);
//Pass the shared array buffers:
postMessage({messageID:0, graphicsBuffer:gfxBuffer, graphicsBuffer2:gfxBuffer2, gfxCount:gfxCount, gfxLock:gfxLock, audioLock:audioLock, audioMetrics:audioMetrics, timestamp:timestamp}, [gfxBuffer.buffer, gfxBuffer2.buffer, gfxCount.buffer, gfxLock.buffer, audioLock.buffer, audioMetrics.buffer, timestamp.buffer]);
//Event decoding:
self.onmessage = function (event) {
    var data = event.data;
    switch (data.messageID | 0) {
        case 0:
            Iodine.play();
            break;
        case 1:
            Iodine.pause();
            break;
        case 2:
            Iodine.restart();
            break;
        case 3:
            Iodine.setIntervalRate(data.payload | 0);
            setInterval(function() {Iodine.timerCallback(Atomics.load(timestamp, 0) >>> 0);}, data.payload | 0);
            break;
        case 4:
            Iodine.attachGraphicsFrameHandler(graphicsFrameHandler);
            break;
        case 5:
            Iodine.attachAudioHandler(audioHandler);
            break;
        case 6:
            Iodine.enableAudio();
            break;
        case 7:
            Iodine.disableAudio();
            break;
        case 8:
            Iodine.toggleSkipBootROM(!!data.payload);
            break;
        case 9:
            Iodine.toggleDynamicSpeed(!!data.payload);
            break;
        case 10:
            Iodine.attachSpeedHandler(speedHandler);
            break;
        case 11:
            Iodine.keyDown(data.payload | 0);
            break;
        case 12:
            Iodine.keyUp(data.payload | 0);
            break;
        case 13:
            Iodine.incrementSpeed(+data.payload);
            break;
        case 14:
            Iodine.setSpeed(+data.payload);
            break;
        case 15:
            Iodine.attachBIOS(data.payload);
            break;
        case 16:
            Iodine.attachROM(data.payload);
            break;
        case 17:
            Iodine.exportSave();
            break;
        case 18:
            Iodine.attachSaveExportHandler(saveExportHandler);
            break;
        case 19:
            Iodine.attachSaveImportHandler(saveImportHandler);
            break;
        case 20:
            processSaveImportSuccess(data.payload);
            break;
        case 21:
            processSaveImportFail();
    }
}
var graphicsFrameHandler = {
    copyBuffer:function (swizzledFrame) {
        //Push a frame of graphics to the blitter handle:
        //Obtain lock on buffer:
        waitForAccess(gfxLock);
        //Pass the data out:
        switch (gfxCount[0]) {
            case 0:
                gfxBuffer.set(swizzledFrame);
                gfxCount[0] = 1;
                break;
            case 1:
                gfxBuffer2.set(swizzledFrame);
                gfxCount[0] = 2;
                break;
            default:
                gfxBuffer.set(gfxBuffer2);
                gfxBuffer2.set(swizzledFrame);
                gfxCount[0] = 2;
        }
        //Release lock:
        releaseLock(gfxLock);
    }
};
//Shim for our audio api:
var audioHandler = {
    initialize:function (channels, sampleRate, bufferLimit, call1, call2, call3) {
        //Initialize the audio mixer input:
        channels = channels | 0;
        sampleRate = +sampleRate;
        bufferLimit = bufferLimit | 0;
        //Generate an audio buffer:
        audioBufferSize = ((bufferLimit | 0) * (channels | 0)) | 0;
        //Only regen the buffer if we need to make it bigger:
        if (!audioBuffer || (audioBufferSize | 0) > (audioBuffer.length | 0)) {
            audioBuffer = getSharedFloat32Array(audioBufferSize | 0);
            postMessage({messageID:1, audioBuffer:audioBuffer}, [audioBuffer.buffer]);
        }
        postMessage({messageID:2, channels:channels | 0, sampleRate:+sampleRate, bufferLimit:bufferLimit | 0});
    },
    push:function (buffer, amountToSend) {
      amountToSend = amountToSend | 0;
        //Push audio to the audio mixer input handle:
        //Obtain lock on buffer:
        waitForAccess(audioLock);
        //Push audio into buffer:
        var offset = audioMetrics[1] | 0;
        var endPosition = Math.min(((amountToSend | 0) + (offset | 0)) | 0, audioBufferSize | 0) | 0;
        for (var position = 0; (offset | 0) < (endPosition | 0); position = ((position | 0) + 1) | 0) {
            audioBuffer[offset | 0] = +buffer[position | 0];
            offset = ((offset | 0) + 1) | 0;
        }
        //Update the cross thread buffering count:
        audioMetrics[1] = offset | 0;
        //Release lock:
        releaseLock(audioLock);
        //If we filled the entire buffer:
        if ((position | 0) < (amountToSend | 0)) {
            //Wait for UI thread to process the buffer, and then queue the next batch:
            Atomics.futexWait(audioLock, 1, 1);
            this.push(buffer.subarray(position | 0), ((amountToSend | 0) - (position | 0)) | 0);
        }
    },
    register:function () {
        //Register into the audio mixer:
        postMessage({messageID:3});
    },
    unregister:function () {
        //Wait for UI thread to empty and process the OLD buffer:
        Atomics.futexWait(audioLock, 1, 1);
        //Unregister from audio mixer:
        postMessage({messageID:4});
    },
    setBufferSpace:function (spaceContain) {
        //Ensure buffering minimum levels for the audio:
        postMessage({messageID:5, audioBufferContainAmount:spaceContain | 0});
    },
    remainingBuffer:function () {
        //Report the amount of audio samples in-flight:
        //Obtain lock on buffer:
        waitForAccess(audioLock);
        var audioDeviceBufferCount = audioMetrics[0] | 0;
        var sharedMemoryBufferCount = audioMetrics[1] | 0;
        //Release lock:
        releaseLock(audioLock);
        return ((audioDeviceBufferCount | 0) + (sharedMemoryBufferCount | 0)) | 0;
    }
};
function saveImportHandler(saveID, saveCallback, noSaveCallback) {
    postMessage({messageID:6, saveID:saveID});
    saveImportPool.push([saveCallback, noSaveCallback]);
}
function saveExportHandler(saveID, saveData) {
    postMessage({messageID:7, saveID:saveID, saveData:saveData});
}
function speedHandler(speed) {
    postMessage({messageID:8, speed:speed});
}
function processSaveImportSuccess(saveData) {
    saveImportPool.shift()[0](saveData);
}
function processSaveImportFail() {
    saveImportPool.shift()[1]();
}
function waitForAccess(buffer) {
    //If already reporting 1, then wait:
    while (Atomics.exchange(buffer, 0, 1) == 1) {
        Atomics.futexWait(buffer, 0, 1);
    }
}
function releaseLock(buffer) {
    //Mark as ready to be consumed:
    buffer[1] = 1;
    //Release lock:
    Atomics.store(buffer, 0, 0);
    Atomics.futexWake(buffer, 0, 1);
}
