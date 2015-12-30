"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function IodineGBAWorkerShim() {
    this.gfx = null;
    this.audio = null;
    this.speed = null;
    this.saveExport = null;
    this.saveImport = null;
    this.worker = null;
    this.graphicsBufferShared = null;
    this.graphicsBufferShared2 = null;
    this.graphicsBufferCount = null;
    this.graphicsLock = null;
    this.audioBuffer = null;
    this.audioLock = null;
    this.audioMetrics = null;
    this.audioInitialized = false;
    this.timestamp = null;
    this.initialize();
}
var tempvar = document.getElementsByTagName("script");
IodineGBAWorkerShim.prototype.filepath = tempvar[tempvar.length-1].src;
IodineGBAWorkerShim.prototype.initialize = function () {
    var parentObj = this;
    this.worker = new Worker(this.filepath.substring(0, (this.filepath.length | 0) - 3) + "Worker.js");
    this.worker.onmessage = function (event) {
        parentObj.decodeMessage(event.data);
    }
}
IodineGBAWorkerShim.prototype.sendMessageSingle = function (eventCode) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode});
}
IodineGBAWorkerShim.prototype.sendMessageDouble = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData});
}
IodineGBAWorkerShim.prototype.sendBufferBack = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData}, [eventData.buffer]);
}
IodineGBAWorkerShim.prototype.play = function () {
    this.sendMessageSingle(0);
}
IodineGBAWorkerShim.prototype.pause = function () {
    this.sendMessageSingle(1);
}
IodineGBAWorkerShim.prototype.restart = function () {
    this.sendMessageSingle(2);
}
IodineGBAWorkerShim.prototype.setIntervalRate = function (rate) {
    rate = rate | 0;
    this.sendMessageDouble(3, rate | 0);
}
IodineGBAWorkerShim.prototype.timerCallback = function (timestamp) {
    timestamp = timestamp >>> 0;
    //If memory location provided for timestamp buffering:
    if (this.timestamp) {
        //Forward latest timestamp to worker:
        Atomics.store(this.timestamp, 0, timestamp >>> 0);
    }
    //Run some checks for graphics:
    if (this.gfx && this.graphicsLock) {
        if (Atomics.load(this.gfxCount, 0) > 0) {
            this.graphicsHeartBeat();
        }
    }
}
IodineGBAWorkerShim.prototype.attachGraphicsFrameHandler = function (gfx) {
    this.gfx = gfx;
    var parentObj = this;
    this.gfx.attachGfxCallback(function () {
        parentObj.graphicsHeartBeat();
    });
    this.sendMessageSingle(4);
}
IodineGBAWorkerShim.prototype.attachAudioHandler = function (audio) {
    this.audio = audio;
    this.sendMessageSingle(5);
}
IodineGBAWorkerShim.prototype.enableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(6);
    }
}
IodineGBAWorkerShim.prototype.disableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(7);
    }
}
IodineGBAWorkerShim.prototype.toggleSkipBootROM = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(8, doEnable | 0);
}
IodineGBAWorkerShim.prototype.toggleDynamicSpeed = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(9, doEnable | 0);
}
IodineGBAWorkerShim.prototype.attachSpeedHandler = function (speed) {
    this.speed = speed;
    this.sendMessageSingle(10);
}
IodineGBAWorkerShim.prototype.keyDown = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(11, keyCode | 0);
}
IodineGBAWorkerShim.prototype.keyUp = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(12, keyCode | 0);
}
IodineGBAWorkerShim.prototype.incrementSpeed = function (newSpeed) {
    newSpeed = +newSpeed;
    this.sendMessageDouble(13, +newSpeed);
}
IodineGBAWorkerShim.prototype.setSpeed = function (newSpeed) {
    newSpeed = +newSpeed;
    this.sendMessageDouble(14, +newSpeed);
}
IodineGBAWorkerShim.prototype.attachBIOS = function (BIOS) {
    this.sendMessageDouble(15, BIOS);
}
IodineGBAWorkerShim.prototype.attachROM = function (ROM) {
    this.sendMessageDouble(16, ROM);
}
IodineGBAWorkerShim.prototype.exportSave = function () {
    this.sendMessageSingle(17);
}
IodineGBAWorkerShim.prototype.attachSaveExportHandler = function (saveExport) {
    this.saveExport = saveExport;
    this.sendMessageSingle(18);
}
IodineGBAWorkerShim.prototype.attachSaveImportHandler = function (saveImport) {
    this.saveImport = saveImport;
    this.sendMessageSingle(19);
}
IodineGBAWorkerShim.prototype.decodeMessage = function (data) {
    switch (data.messageID | 0) {
        case 0:
            this.buffersInitialize(data.graphicsBuffer, data.graphicsBuffer2, data.gfxCount, data.gfxLock, data.audioLock, data.audioMetrics, data.timestamp);
            break;
        case 1:
            this.audioBufferPush(data.audioBuffer);
            break;
        case 2:
            this.audioInitialize(data.channels | 0, +data.sampleRate, data.bufferLimit | 0, data.audioBuffer);
            break;
        case 3:
            this.audioRegister();
            break;
        case 4:
            this.audioUnregister();
            break;
        case 5:
            this.audioSetBufferSpace(data.audioBufferContainAmount | 0);
            break;
        case 6:
            this.saveImportRequest(data.saveID);
            break;
        case 7:
            this.saveExportRequest(data.saveID, data.saveData);
            break;
        default:
            this.speedPush(+data.speed);
    }
}
IodineGBAWorkerShim.prototype.audioInitialize = function (channels, sampleRate, bufferLimit) {
    channels = channels | 0;
    sampleRate = +sampleRate;
    bufferLimit = bufferLimit | 0;
    var parentObj = this;
    if (this.audio) {
        //(Re-)Initialize:
        this.audio.initialize(channels | 0, +sampleRate, bufferLimit | 0, function () {
            //Empty buffers inside the provided audio event callback:
            parentObj.audioHeartBeat();
        }, function () {
            //Get the remaining sample count:
            parentObj.audioPostHeartBeat();
        },function () {
            //Disable audio in the callback here:
            parentObj.disableAudio();
        });
        this.audioInitialized = true;
    }
}
IodineGBAWorkerShim.prototype.audioBufferPush = function (audioBuffer) {
    //Grab the new buffer:
    this.audioBuffer = audioBuffer;
}
IodineGBAWorkerShim.prototype.audioHeartBeat = function () {
    //If audio API handle provided and we got a buffer reference:
    if (this.audioInitialized) {
        //Waits while locked:
        this.waitForAccess(this.audioLock);
        //Check to make sure we can consume the buffer:
        if (this.isConsumable(this.audioLock)) {
            //Empty the buffer out:
            this.consumeAudioBuffer();
        }
        //Give accurate sample count prior to lock release:
        this.audioPostHeartBeat();
        //Free up access to the buffer:
        this.releaseLock(this.audioLock);
        //Tell audio mixer input to flush to audio mixer:
        this.audio.flush();
    }
}
IodineGBAWorkerShim.prototype.consumeAudioBuffer = function () {
    //Copy samples out to audio mixer input (but don't process them yet):
    this.audio.pushDeferred(this.audioBuffer, this.audioMetrics[1] | 0);
    //Set in flight sample count across thread boundary to zero:
    this.audioMetrics[1] = 0;
}
IodineGBAWorkerShim.prototype.audioPostHeartBeat = function () {
    //Push latest audio metrics with no buffering:
    Atomics.store(this.audioMetrics, 0, this.audio.remainingBuffer() | 0);
}
IodineGBAWorkerShim.prototype.graphicsHeartBeat = function () {
    //If graphics callback handle provided and we got a buffer reference:
    if (this.gfx && this.graphicsLock) {
        //Waits while locked:
        this.waitForAccess(this.graphicsLock);
        //Check to make sure we can consume the buffer:
        if (this.isConsumable(this.graphicsLock)) {
            //Copy the buffer out to local:
            this.consumeGraphicsBuffer();
        }
        //Free up access to the buffer:
        this.releaseLock(this.graphicsLock);
    }
}
IodineGBAWorkerShim.prototype.consumeGraphicsBuffer = function () {
    switch (this.gfxCount[0]) {
        case 1:
            this.gfx.copyBuffer(this.graphicsBufferShared);
            break;
        case 2:
            this.gfx.copyBuffer(this.graphicsBufferShared);
            this.gfx.copyBuffer(this.graphicsBufferShared2);
    }
    this.gfxCount[0] = 0;
}
IodineGBAWorkerShim.prototype.audioRegister = function () {
    if (this.audio) {
        this.audio.register();
    }
}
IodineGBAWorkerShim.prototype.audioUnregister = function () {
    if (this.audio) {
        //Empty the existing buffer:
        this.audioHeartBeat();
        //Unregister from mixer:
        this.audio.unregister();
    }
}
IodineGBAWorkerShim.prototype.audioSetBufferSpace = function (bufferSpace) {
    bufferSpace = bufferSpace | 0;
    if (this.audio) {
        this.audio.setBufferSpace(bufferSpace | 0);
    }
}
IodineGBAWorkerShim.prototype.buffersInitialize = function (graphicsBuffer, graphicsBuffer2, gfxCount, gfxLock, audioLock, audioMetrics, timestamp) {
    this.graphicsBufferShared = graphicsBuffer;
    this.graphicsBufferShared2 = graphicsBuffer2;
    this.gfxCount = gfxCount;
    this.graphicsLock = gfxLock;
    this.audioLock = audioLock;
    this.audioMetrics = audioMetrics;
    this.timestamp = timestamp;
}
IodineGBAWorkerShim.prototype.speedPush = function (speed) {
    speed = +speed;
    if (this.speed) {
        this.speed(+speed);
    }
}
IodineGBAWorkerShim.prototype.saveImportRequest = function (saveID) {
    if (this.saveImport) {
        var parentObj = this;
        this.saveImport(saveID, function (saveData) {
            parentObj.sendMessageDouble(20, saveData);
        },
        function () {
            parentObj.sendMessageSingle(21);
        });
    }
}
IodineGBAWorkerShim.prototype.saveExportRequest = function (saveID, saveData) {
    if (this.saveExport) {
        this.saveExport(saveID, saveData);
    }
}
IodineGBAWorkerShim.prototype.waitForAccess = function (buffer) {
    //Check if the other thread locked access (And mark as locked):
    while (Atomics.exchange(buffer, 0, 1) == 1) {
        //Wait for other thread to release lock:
        Atomics.futexWait(buffer, 0, 1);
    }
}
IodineGBAWorkerShim.prototype.releaseLock = function (buffer) {
    //Mark as consumed:
    buffer[1] = 0;
    //Unlock:
    Atomics.store(buffer, 0, 0);
    Atomics.futexWake(buffer, 0, 1);
    Atomics.futexWake(buffer, 1, 1);
}
IodineGBAWorkerShim.prototype.isConsumable = function (buffer) {
    //If the buffer hasn't been consumed yet, it'll be 1 here:
    return (buffer[1] == 1);
}
