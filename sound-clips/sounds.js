angular.module('mainApp').controller('SoundCtrl', ($rootScope, $scope) => {
    let timer;
    let notesLoop;
    const osc = new p5.Oscillator();
    osc.setType('sine');
    osc.freq(240);
    osc.amp(0);
    osc.start();

    const stopAfterASec = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            osc.amp(0, 0.5);
        }, 1000);
    }

    $scope.allNotes = Object.keys($rootScope.keyNotes);

    $scope.playNote = function (note) {
        if (!$rootScope.keyNotes[note]) {
            return;
        }
        osc.freq($rootScope.keyNotes[note]);
        osc.amp(0.5, 0.05);
        stopAfterASec();
    };

    $scope.playAllNotes = function () {
        if (notesLoop) {
            clearInterval(notesLoop);
            notesLoop = null;
        }
        $('#basic-keys .all-keys').find('button').removeClass('active');
        const noteBtns = $('#basic-keys .all-keys').find('button');
        let index = 0;
        $(noteBtns[index]).addClass('active');
        $(noteBtns[index]).click();

        notesLoop = setInterval(() => {
            $(noteBtns[index]).removeClass('active');
            index++;
            if (!noteBtns[index]) {
                $scope.stopPlayback();
                return;
            }
            $(noteBtns[index]).addClass('active');
            $(noteBtns[index]).click();
        }, 800);

    };

    $scope.stopPlayback = function () {
        $('#basic-keys .all-keys').find('button').removeClass('active');
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (notesLoop) {
            clearInterval(notesLoop);
            notesLoop = null;
        }
        osc.amp(0, 0.5);
    };
});