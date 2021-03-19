let n = 0, delay = 1000,requestFail=true;
let timerId = setTimeout(function repeat() {
    delay = delay * 2;
    console.log(delay);
    timerId = setTimeout(repeat,delay)
}, delay)