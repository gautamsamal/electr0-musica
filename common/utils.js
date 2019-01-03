class Utils {
    constructor() {

    }

    static setUpScheduler(schedule, interval) {
        const timerWorker = new Worker("common/worker.js");
        timerWorker.onmessage = function (e) {
            if (e.data == "tick") {
                // console.log("tick!");
                schedule();
            }
            else
                console.log("message: " + e.data);
        };
        timerWorker.postMessage({ "interval": interval || 25 }); //25 milliseconds
        return timerWorker;
    }

    static convertBlobToAudioBuffer(context, blob, callback = () => { }) {
        let arrayBuffer;
        let fileReader = new FileReader();
        fileReader.onload = function (event) {
            arrayBuffer = event.target.result;
            context.decodeAudioData(arrayBuffer, function (buffer) {
                console.log('Buffer---', buffer)
                callback(null, buffer);
            }, function (e) {
                console.log("Error with decoding audio data" + e.err);
                callback(e);
            });
        };
        fileReader.readAsArrayBuffer(blob);
    }

    static arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static convertFileToArrayBuffer($file, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            callback(e.target.result);
        };
        reader.readAsArrayBuffer($file);
    };

    static base64ToAudioBuffer(base64, callback) {
        const arrayBuffer = Utils.base64ToArrayBuffer(base64);
        const context = new AudioContext();
        context.decodeAudioData(arrayBuffer, function (buffer) {
            console.log('base64ToAudioBuffer Buffer---', buffer)
            callback(null, buffer);
        }, function (e) {
            console.log("base64ToAudioBuffer Error with decoding audio data" + e.err);
            callback(e);
        });
    }

    static get audioBufferUtility() {
        return window.BufferUtility;
    }

    static cloneAudioBuffer(buffer) {
        return Utils.audioBufferUtility.clone(buffer);
    }
}