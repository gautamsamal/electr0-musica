# electr0-musica

Provides an web based interface to sythensize new tones, merge them, put together in a timeline. Every concept is designed with vanilla javscript and AudioContext. 
https://developer.mozilla.org/en-US/docs/Web/API/AudioContext

*** It was developed as a part of coding competition and some parts may not be optimized to best standards or have some logical flaws.
*** A visual library is added for visualization based on frequency, just for demonstration.

#### Technology Stack
##### Angular JS v1
It's used just for convenience to wire up a Single page application. It has the ability to design a quick architecture in a short time.
##### Node JS
No use in primary just. We have used it just to setup a server that can process an audio file as a project. Provided the ability to save and reload the project. There is no dedicated storage and it uses the local server to store a project file.

-----
The final draft is in `synthesizerV2/**`. We have the core library that abstracts the implementation and probably you can reuse in other application - `synthesizerV2/audioLibrary.js`

#### Quick Setup
There is no complex step to get it run in local machine. Check out the project. Make sure you have Node JS installed.
- Run - `npm i`
- Run - `node server.js`

#### Screenshots
![Synthesizer](/Synthesizer.png)


![Studio/Time-line](/timeline.png)
