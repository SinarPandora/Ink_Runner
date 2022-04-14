(function (storyContent) {

    // Create ink story from the content using inkjs
    let story = new inkjs.Story(storyContent);

    let savePoint = '';

    let globalTagTheme;
    let additionThemes = ['dark'];
    let nextTag = 'p';
    let undoTagChange = false;
    let inline = {
        isInline: false,
        into: false,
        exit: false,
        paragraphGroup: null
    };
    let textAnimate = [];
    let debugMode = false;
    let DEFAULT_DELAY = 400.0;

    // TOAST Plugin config
    const TOAST_COLOR = {
        'default': '#353535',
        'success': 'linear-gradient(to right, #4CAF50, #43A047)',
        'highlight': 'linear-gradient(to right, #FF8F00, #FF6F00)',
        'danger': 'linear-gradient(to right, #D32F2F, #C62828)',
    }

    // Global tags - those at the top of the ink file
    // We support:
    //  # title: name
    //  # theme: dark
    //  # author: Your Name
    //  # addition_themes: dark
    //  # text_animate: class list
    //  # debug: on/off
    let globalTags = story.globalTags;
    if (globalTags) {
        for (let i = 0; i < story.globalTags.length; i++) {
            let globalTag = story.globalTags[i];
            let splitTag = splitPropertyTag(globalTag);

            // title: name
            if (splitTag && splitTag.property === 'title') {
                document.title = splitTag.val;
                let title = document.querySelector('h1#title');
                title.innerHTML = splitTag.val;
            }

            // THEME: dark
            else if (splitTag && splitTag.property === 'theme') {
                globalTagTheme = splitTag.val;
            }

            // author: Your Name
            else if (splitTag.property === 'author') {
                let byline = document.querySelector('.byline');
                byline.innerHTML = '作者：' + splitTag.val;
                document.title = splitTag.val;
            }

            // addition_themes: themes(split with comma)
            else if (splitTag.property === 'addition_themes') {
                additionThemes = splitTag.val.split(',');
            }

            // text_animate: css
            else if (splitTag && splitTag.property === 'text_animate') {
                textAnimate = splitTag.val.split(',').map(it => it.trim());
            }

            // debug: on/off
            else if (splitTag && splitTag.property === 'debug') {
                console.log(`  _____ _   _ _  __  _____  ______ ____  _    _  _____    ____  _   _   _ 
 |_   _| \\ | | |/ / |  __ \\|  ____|  _ \\| |  | |/ ____|  / __ \\| \\ | | | |
   | | |  \\| | ' /  | |  | | |__  | |_) | |  | | |  __  | |  | |  \\| | | |
   | | | . \` |  <   | |  | |  __| |  _ <| |  | | | |_ | | |  | | . \` | | |
  _| |_| |\\  | . \\  | |__| | |____| |_) | |__| | |__| | | |__| | |\\  | |_|
 |_____|_| \\_|_|\\_\\ |_____/|______|____/ \\____/ \\_____|  \\____/|_| \\_| (_)
 
 Using window.story to get the ink story, be free!
`)
                debugMode = splitTag.val === 'on';
                if (debugMode) {
                    DEFAULT_DELAY = 200;
                    window.story = story;
                    window.$DebugWindowScope = $DebugWindowScope;
                    const debugWindowElement = document.getElementById("debug-window-prototype")
                        .cloneNode(true);
                    debugWindowElement.setAttribute('x-data', '$DebugWindowScope()');
                    debugWindowElement.setAttribute('x-init', 'activeValueWatcher()');
                    setTimeout(() => {
                        new WinBox("😎️ GOD MODE", {
                            id: 'debug-window',
                            width: 600,
                            height: 400,
                            x: 'center',
                            y: 'center',
                            mount: debugWindowElement
                        });
                        setTimeout(() => {
                            document.querySelector('#debug-window .wb-min').click();
                        });
                    })
                } else {
                    window.$DebugWindowScope = () => ({});
                    document.getElementById('debug-window').remove();
                }
            }
        }
    }

    let storyContainer = document.querySelector('#story');
    let outerScrollContainer = document.querySelector('.outerContainer');

    // page features setup
    setupTheme(globalTagTheme);
    let hasSave = loadSavePoint();
    setupButtons(hasSave);

    // Set initial save point
    savePoint = story.state.toJson();

    // Kick off the start of the story!
    continueStory().then();

    // Main story processing function. Each time this is called it generates
    // all the next content up as far as the next set of choices.
    async function continueStory() {
        let delay = DEFAULT_DELAY;

        // The length of the previous paragraph
        let previousParagraphLength = 0;

        // Inline text
        let inlineText = '';

        // Generate story text - loop through available content
        while (story.canContinue) {
            const postTasks = [];

            // Get ink to generate the next paragraph
            // Variable will be inject here
            let paragraphText = story.Continue();
            let tags = story.currentTags;
            console.debug(`${paragraphText} -> ${tags}`)

            // Any special tags included with this line
            let customClasses = [];
            for (let i = 0; i < tags.length; i++) {
                let tag = tags[i];

                // Detect tags of the form 'X: Y'. Currently used for IMAGE and CLASS but could be
                // customised to be used for other things too.
                let splitTag = splitPropertyTag(tag);

                if (splitTag) {
                    // AUDIO: src,delay
                    if (splitTag.property === 'AUDIO') {
                        let [src, delay, vol] = splitTag.val.split(',');
                        setTimeout(() => {
                            if ('audio' in this) {
                                this.audio.pause();
                                this.audio.removeAttribute('src');
                                this.audio.load();
                            }
                            this.audio = new Audio(src);
                            this.audio.preload = 'auto';
                            if (vol != null) {
                                this.audio.volume = +vol;
                            }
                            this.audio.play();
                        }, delay == null ? 0 : +delay);
                    }

                    // AUDIOLOOP: src,delay
                    else if (splitTag.property === 'AUDIOLOOP') {
                        let [src, delay, vol] = splitTag.val.split(',');
                        setTimeout(() => {
                            if ('audioLoop' in this) {
                                this.audioLoop.pause();
                                this.audioLoop.removeAttribute('src');
                                this.audioLoop.load();
                            }
                            this.audioLoop = new Audio(src);
                            this.audioLoop.preload = 'auto';
                            if (vol != null) {
                                this.audioLoop.volume = +vol;
                            }
                            this.audioLoop.play();
                            this.audioLoop.loop = true;
                        }, delay == null ? 0 : +delay);
                    }

                    // IMAGE: src
                    else if (splitTag.property === 'IMAGE') {
                        let imageElement = document.createElement('img');
                        imageElement.src = splitTag.val;
                        storyContainer.appendChild(imageElement);

                        await showAfter(delay, imageElement);
                    }

                    // LINK: url
                    else if (splitTag.property === 'LINK') {
                        window.location.href = splitTag.val;
                    }

                    // LINKOPEN: url
                    else if (splitTag.property === 'LINKOPEN') {
                        window.open(splitTag.val);
                    }

                    // SETTHEME: name
                    else if (splitTag.property === 'SETTHEME') {
                        document.body.classList.remove(...additionThemes);
                        if (splitTag.val !== 'default') {
                            document.body.classList.add(splitTag.val);
                        }
                    }

                    // BACKGROUND: src
                    else if (splitTag.property === 'BACKGROUND') {
                        outerScrollContainer.style.backgroundImage = 'url(' + splitTag.val + ')';
                    }

                    // CLASS: class1,class2
                    else if (splitTag.property === 'CLASS') {
                        customClasses.push(...splitTag.val.split(','));
                    }

                    // ANIMATE: prop1,prop2
                    else if (splitTag.property === 'ANIMATE') {
                        customClasses.push('animate__animated', ...splitTag.val.split(',').map(prop => `animate__${prop}`));
                    }

                    // ASK: [variable, question, default answer] in array form
                    else if (splitTag.property === 'ASK') {
                        const args = eval(splitTag.val);
                        if (args.length < 2) {
                            alert("脚本错误，ASK 标签没有被正确配置")
                        } else {
                            postTasks.push(async () => {
                                return new Promise(resolve => setTimeout(() => {
                                    const [variable, question, defaultAnswer] = args;
                                    const result = prompt(question, defaultAnswer);
                                    story.variablesState[variable] = result == null ? (defaultAnswer ?? '') : result;
                                    savePoint = story.state.toJson();
                                    resolve();
                                }));
                            });
                        }
                    }

                    // WINDOW: [title, config] in array form
                    else if (splitTag.property === 'WINDOW') {
                        const args = eval(splitTag.val);
                        if (args.length < 2) {
                            alert("脚本错误，WINDOW 标签没有被正确配置")
                        } else {
                            postTasks.push(async () => {
                                return new Promise(resolve => setTimeout(() => {
                                    const [title, config] = args;
                                    new WinBox(title, config);
                                    resolve();
                                }));
                            });
                        }
                    }

                    // HEADER: show/hidden
                    else if (splitTag.property === 'HEADER') {
                        if (splitTag.val.toLowerCase() === 'show') {
                            setVisible('.header', true);
                        } else if (splitTag.val.toLowerCase() === 'hidden') {
                            setVisible('.header', false);
                        }
                    }

                    // HTML_TAG: name
                    else if (splitTag.property === 'HTML_TAG') {
                        nextTag = splitTag.val;
                        undoTagChange = true;
                    }

                    // SETTITLE: name
                    else if (splitTag.property === 'SETTITLE') {
                        document.title = splitTag.val;
                        document.querySelector('h1#title').innerHTML = splitTag.val;
                    }

                    // SETAUTHOR: name
                    else if (splitTag.property === 'SETAUTHOR') {
                        let byline = document.querySelector('.byline');
                        byline.innerHTML = '作者：' + splitTag.val;
                        document.title = splitTag.val;
                    }

                    // DELAY: number(ms)
                    else if (splitTag.property === 'DELAY') {
                        delay += +splitTag.val;
                        postTasks.push(async () => delay = DEFAULT_DELAY);
                    }

                    // TOAST: [text, color, timeout, avatar] in array form
                    else if (splitTag.property === 'TOAST') {
                        const args = eval(splitTag.val);
                        if (args.length < 1) {
                            alert("脚本错误，TOAST 标签没有被正确配置")
                        } else {
                            postTasks.push(async () => await toast(args));
                        }
                    }

                    // MESSAGE: [avatar, text, color, timeout] in array form
                    else if (splitTag.property === 'MESSAGE') {
                        const args = eval(splitTag.val);
                        if (args.length < 2) {
                            alert("脚本错误，MESSAGE 标签没有被正确配置")
                        } else {
                            let [avatar, text, color, timeout] = args;
                            postTasks.push(async () => await toast([text, color ?? null, timeout ?? null, avatar]));
                        }
                    }

                    // TOASTER: config
                    else if (splitTag.property === 'TOASTER') {
                        postTasks.push(async () => {
                            return new Promise(resolve => setTimeout(() => {
                                Toastify(eval(splitTag.val)).showToast()
                                resolve();
                            }));
                        });
                    }

                    // READER_INPUT: [prompt, variable, defaultValue, pattern, type]
                    else if (splitTag.property === 'READER_INPUT') {
                        const args = eval(splitTag.val);
                        if (args.length < 2) {
                            alert("脚本错误，READER_INPUT 标签没有被正确配置")
                        } else {
                            postTasks.push(async () => {
                                const [prompt, variable, defaultValue, pattern, type] = args;
                                await requireReaderInput(prompt, variable, defaultValue ?? '', pattern, type ?? 'text');
                            });
                        }
                    }

                } else {
                    // AUDIOLOOP_PAUSE
                    if (tag === 'AUDIOLOOP_PAUSE') {
                        this.audioLoop.pause();
                    }

                    // AUDIOLOOP_RESUME
                    else if (tag === 'AUDIOLOOP_RESUME') {
                        if (this.audioLoop.paused) {
                            setTimeout(() => this.audioLoop.play());
                        } else {
                            console.warn('Audio loop already playing.')
                        }
                    }

                    // UNSET_BACKGROUND
                    else if (tag === 'UNSET_BACKGROUND') {
                        outerScrollContainer.style.backgroundImage = undefined;
                    }

                    // INLINE
                    else if (tag === 'INLINE') {
                        inline.isInline = true;
                        inline.into = true;
                    }

                    // UNINLINE
                    else if (tag === 'UNINLINE') {
                        inline.exit = true;
                    }

                    // CLEAR_KEEP_HEADER - clears but keep header visible
                    else if (tag === 'CLEAR_KEEP_HEADER') {
                        resetStoryContainer();
                    }

                        // CLEAR - removes all existing content.
                    // RESTART - clears everything and restarts the story from the beginning
                    else if (tag === 'CLEAR' || tag === 'RESTART') {
                        resetStoryContainer();

                        // Comment out this line if you want to leave the header visible when clearing
                        setVisible('.header', false);

                        if (tag === 'RESTART') {
                            restart();
                            return;
                        }
                    }
                }
            }

            // Create paragraph element (initially hidden)
            if (inline.isInline) {
                if (inline.into) {
                    inline.paragraphGroup = document.createElement('p');
                    inline.into = false;
                    nextTag = 'span';
                }

                if (paragraphText.trim() !== 'TAG_ONLY') {
                    let inlineElement = document.createElement(nextTag);
                    if (undoTagChange) {
                        nextTag = 'span';
                        undoTagChange = false;
                    }
                    inlineElement.innerHTML = paragraphText;
                    inlineText += paragraphText;
                    // Add any custom classes derived from ink tags
                    for (let i = 0; i < customClasses.length; i++)
                        inlineElement.classList.add(customClasses[i]);
                    inline.paragraphGroup.appendChild(inlineElement);
                }

                if (inline.exit) {
                    storyContainer.appendChild(inline.paragraphGroup);
                    // Fade in paragraph after a short delay
                    await showAfter(calcElementDelay(delay, previousParagraphLength), inline.paragraphGroup);
                    await scrollDown();
                    previousParagraphLength = inlineText.length;
                    inlineText = '';
                    inline.exit = false;
                    inline.isInline = false;
                    nextTag = 'p';
                }
            } else if (paragraphText.trim() !== 'TAG_ONLY') {
                let paragraphElement = document.createElement(nextTag);
                if (undoTagChange) {
                    nextTag = 'p';
                    undoTagChange = false;
                }
                paragraphElement.innerHTML = paragraphText;
                storyContainer.appendChild(paragraphElement);

                // Add any custom classes derived from ink tags
                for (let i = 0; i < customClasses.length; i++)
                    paragraphElement.classList.add(customClasses[i]);

                // Fade in paragraph after a short delay
                await showAfter(calcElementDelay(delay, previousParagraphLength), paragraphElement);
                await scrollDown();
                previousParagraphLength = paragraphText.length;
            }

            for (let task of postTasks) {
                await task();
            }
        } // End story loop

        if (story.currentChoices.length > 1) {
            // Wait default delay before show choices
            await new Promise(resolve => setTimeout(() => {
                resolve()
            }, calcElementDelay(delay, previousParagraphLength)))
        }

        // Create HTML choices from ink choices
        let choiceClicked = false;
        const choiceElements = [];
        for (const choice of story.currentChoices) {
            // Create paragraph with anchor element
            let choiceParagraphElement = document.createElement('p');
            choiceParagraphElement.classList.add('choice');
            choiceParagraphElement.innerHTML = `<a href='#'>${choice.text}</a>`
            storyContainer.appendChild(choiceParagraphElement);

            const onClickFunction = function (event) {
                // Choice lock on click
                if (choiceClicked) return;
                choiceClicked = true;

                // Don't follow <a> link
                event.preventDefault();

                // Tell the story where to go next
                story.ChooseChoiceIndex(choice.index);

                // This is where the save button will save from
                savePoint = story.state.toJson();

                // Disable other choice
                for (const {idx, element, onClick} of choiceElements) {
                    element.removeEventListener('click', onClick);
                    if (idx !== choice.index || debugMode) {
                        element.classList.add('hide');
                    } else {
                        element.classList.add('animate__animated', 'animate__flash', 'hide');
                    }
                }

                setTimeout(() => {
                    // Remove all existing choices
                    removeAll('.choice');

                    // Aaand loop
                    continueStory().then();
                }, 1000); // The default animate timout
            }

            choiceElements.push({idx: choice.index, element: choiceParagraphElement, onClick: onClickFunction});

            // Click on choice
            let choiceAnchorEl = choiceParagraphElement.querySelectorAll('a')[0];
            choiceAnchorEl.addEventListener('click', onClickFunction);

            // Fade choice in after a short delay
            await showAfter(200, choiceParagraphElement);
            await scrollDown();
        }
    }

    function restart() {
        story.ResetState();

        setVisible('.header', true);

        // set save point to here
        savePoint = story.state.toJson();

        outerScrollContainer.scrollTo(0, 0);

        continueStory().then();
    }

    // -----------------------------------
    // Various Helper functions
    // -----------------------------------

    // Fades in an element after a specified delay
    async function showAfter(delay, el) {
        return new Promise(resolve => {
            el.classList.add(textAnimate.length > 0 ? 'invisible' : 'hide');
            setTimeout(function () {
                if (textAnimate.length > 0) {
                    el.classList.remove('invisible');
                    el.classList.add(...textAnimate);
                } else {
                    el.classList.remove('hide');
                }
                resolve();
            }, delay);
        });
    }

    // Scrolls the page down, but no further than the bottom edge of what you could
    // see previously, so it doesn't go too far.
    async function scrollDown() {
        return new Promise(resolve => {
            // Extend height to fit
            // We do this manually so that removing elements and creating new ones doesn't
            // cause the height (and therefore scroll) to jump backwards temporarily.
            storyContainer.style.height = contentBottomEdgeY() + 'px';

            // Line up top of screen with the bottom of where the previous content ended
            let target = contentBottomEdgeY();

            // Can't go further than the very bottom of the page
            let limit = outerScrollContainer.scrollHeight - outerScrollContainer.clientHeight;
            if (target > limit) target = limit;

            let start = outerScrollContainer.scrollTop;

            let dist = target - start;
            let duration = 300 + 300 * dist / 100;
            let startTime = null;

            function step(time) {
                if (startTime == null) startTime = time;
                let t = (time - startTime) / duration;
                let lerp = 3 * t * t - 2 * t * t * t; // ease in/out
                outerScrollContainer.scrollTo(0, (1.0 - lerp) * start + lerp * target);
                if (t < 1) requestAnimationFrame(step);
                else resolve()
            }

            requestAnimationFrame(step);
        })
    }

    // The Y coordinate of the bottom end of all the story content, used
    // for growing the container, and deciding how far to scroll.
    function contentBottomEdgeY() {
        let bottomElement = storyContainer.lastElementChild;
        return bottomElement ? bottomElement.offsetTop + bottomElement.offsetHeight : 0;
    }

    // Calculate element delay by string length
    function calcElementDelay(currentDelay, previousParagraphLength) {
        if (currentDelay !== DEFAULT_DELAY) {
            return currentDelay;
        } else if (debugMode) {
            return DEFAULT_DELAY;
        }
        return currentDelay + Math.floor(previousParagraphLength / 15) * 1000;
    }

    // Remove all elements that match the given selector. Used for removing choices after
    // you've picked one, as well as for the CLEAR and RESTART tags.
    function removeAll(selector) {
        let allElements = storyContainer.querySelectorAll(selector);
        for (let i = 0; i < allElements.length; i++) {
            let el = allElements[i];
            el.parentNode.removeChild(el);
        }
    }

    // Used for hiding and showing the header when you CLEAR or RESTART the story respectively.
    function setVisible(selector, visible) {
        let allElements = storyContainer.querySelectorAll(selector);
        for (let i = 0; i < allElements.length; i++) {
            let el = allElements[i];
            if (!visible)
                el.classList.add('invisible');
            else
                el.classList.remove('invisible');
        }
    }

    // Helper for parsing out tags of the form:
    //  # PROPERTY: value
    // e.g. IMAGE: source path
    function splitPropertyTag(tag) {
        let propertySplitIdx = tag.indexOf(':');
        if (propertySplitIdx != null) {
            let property = tag.substring(0, propertySplitIdx).trim();
            let val = tag.substring(propertySplitIdx + 1).trim();
            return {
                property: property,
                val: val
            };
        }

        return null;
    }

    // Loads save state if exists in the browser memory
    function loadSavePoint() {

        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                story.state.LoadJson(savedState);
                return true;
            }
        } catch (e) {
            console.debug("Couldn't load save state");
        }

        story.ResetState();
        return false;
    }

    // Detects which theme (light or dark) to use
    function setupTheme(globalTagTheme) {

        // load theme from browser memory
        let savedTheme;
        try {
            savedTheme = window.localStorage.getItem('theme');
        } catch (e) {
            console.debug("Couldn't load saved theme");
        }

        // Check whether the OS/browser is configured for dark mode
        let browserDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark'
            || (savedTheme == null && globalTagTheme === 'dark')
            || (savedTheme == null && globalTagTheme == null && browserDark))
            document.body.classList.add('dark');
    }

    // Used to hook up the functionality for global functionality buttons
    function setupButtons(hasSave) {

        let rewindEl = document.getElementById('rewind');
        if (rewindEl) rewindEl.addEventListener('click', function (_event) {
            resetStoryContainer();
            setVisible('.header', false);
            restart();
        });

        let saveEl = document.getElementById('save');
        if (saveEl) saveEl.addEventListener('click', function (_event) {
            try {
                window.localStorage.setItem('save-state', savePoint);
                document.getElementById('reload').removeAttribute('disabled');
                window.localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : '');
            } catch (e) {
                console.warn("Couldn't save state");
            }

        });

        let reloadEl = document.getElementById('reload');
        if (!hasSave) {
            reloadEl.setAttribute('disabled', 'disabled');
        }
        reloadEl.addEventListener('click', function (_event) {
            if (reloadEl.getAttribute('disabled'))
                return;

            resetStoryContainer();
            try {
                let savedState = window.localStorage.getItem('save-state');
                if (savedState) story.state.LoadJson(savedState);
            } catch (e) {
                console.debug("Couldn't load save state");
            }
            continueStory().then();
        });

        let themeSwitchEl = document.getElementById('theme-switch');
        if (themeSwitchEl) themeSwitchEl.addEventListener('click', function (_event) {
            document.body.classList.add('switched');
            document.body.classList.toggle('dark');
        });
    }

    /**
     * Show toast
     *
     * @param args Toast args
     */
    async function toast(args) {
        return new Promise(resolve => setTimeout(() => {
            let [text, color, timeout, avatar] = args;
            color = TOAST_COLOR[color] ?? TOAST_COLOR.default;
            timeout = timeout ?? 4000;
            Toastify({
                text: text,
                style: {
                    background: color,
                    minWidth: '300px',
                    display: 'flex',
                    alignItems: 'center',
                },
                avatar: avatar,
                gravity: 'bottom',
                position: 'center',
                duration: timeout,
                stopOnFocus: true,
            }).showToast()
            resolve();
        }));
    }

    /**
     * Require reader input
     * <div>
     *     <p> Prompt </p>
     *     <input /><button> Submit </button>
     *     <span> Hit </span>
     * </div>
     *
     * @param promptText     Prompt information
     * @param variable       Variable to set the value
     * @param defaultValue   Default value
     * @param pattern        Value pattern, for number is range or regex, for text is regex
     * @param type           Input type, string or number
     */
    async function requireReaderInput(promptText, variable, defaultValue, pattern, type) {
        // Create validator
        let validator = null;
        if (pattern != null) {
            if (pattern instanceof RegExp) {
                validator = (a) => pattern.test(a);
            } else if (type === 'number') {
                // If pattern is "number ~ number"
                if (/-?\d+\s*~\s*-?\d+/.test(pattern.trim())) {
                    const [from, to] = pattern.split('~').map(it => it.trim());
                    validator = (a) => a >= from && a <= to;
                } else {
                    try {
                        const regex = new RegExp(pattern);
                        validator = (a) => regex.test(a);
                    } catch (e) {
                        alert("脚本错误，READER_INPUT 标签没有被正确配置，正则表达式配置不正确，输入验证将不会生效");
                        console.error(e);
                    }
                }
            } else if (type === 'text') {
                try {
                    const regex = new RegExp(pattern);
                    validator = (a) => regex.test(a);
                } catch (e) {
                    alert("脚本错误，READER_INPUT 标签没有被正确配置，正则表达式配置不正确，输入验证将不会生效");
                    console.error(e);
                }
            } else {
                alert(`脚本错误，READER_INPUT 标签没有被正确配置，不支持的类型：${type}`)
            }
        }
        // Container
        const container = document.createElement('div');
        container.classList.add('reader-input');
        container.id = 'reader-input';
        // Prompt
        const prompt = document.createElement('p');
        prompt.textContent = promptText;
        // Input
        const input = document.createElement('input');
        input.placeholder = defaultValue !== '' ? `默认值：${defaultValue}` : '';
        input.value = defaultValue;
        input.type = type ?? 'text';
        // Submit
        const submit = document.createElement('button');
        submit.textContent = '确认';
        // Hit
        const hit = document.createElement('span');
        hit.classList.add('hide');
        hit.textContent = '输入格式不正确';
        // Input function
        if (validator != null) {
            input.oninput = () => {
                const value = input.value.trim();
                if ((value === '' && defaultValue !== '') || validator(value)) {
                    if (!hit.classList.contains('hide')) {
                        hit.classList.add('hide');
                    }
                    submit.disabled = false;
                    submit.textContent = '确认';
                } else {
                    if (hit.classList.contains('hide')) {
                        hit.classList.remove('hide');
                    }
                    submit.disabled = true;
                    submit.textContent = '请输入';
                }
            }
        }
        // assemble
        container.appendChild(prompt);
        container.appendChild(input);
        container.appendChild(submit);
        container.appendChild(hit);
        storyContainer.appendChild(container);
        await showAfter(DEFAULT_DELAY, container);
        await scrollDown();
        // Button function
        return new Promise(resolve => {
            let isButtonClicked = false;
            submit.onclick = () => {
                if (isButtonClicked) return;
                isButtonClicked = true;
                input.disabled = true;
                const value = input.value?.trim();
                story.variablesState[variable] = (value == null || value === '') ? defaultValue : value;
                container.classList.add('hide');
                setTimeout(() => {
                    container.remove();
                    resolve();
                }, 800); // The default animate timout
            }
        })
    }

    /**
     * Reset story container by remove all content elements
     */
    function resetStoryContainer() {
        removeAll('p');
        removeAll('span');
        removeAll('img');
        removeAll('.reader-input');
    }

    /**
     * Debug Window
     * @returns {{}} X-data
     */
    function $DebugWindowScope() {
        return {
            variables: [],
            valueWatcher: null,
            keyword: '',
            activeValueWatcher() {
                this.valueWatcher = setInterval(() => {
                    let variables = [...story.variablesState._globalVariables.entries()];
                    const keyword = this.keyword.trim();
                    if (this.keyword.trim().length > 0) {
                        const keywords = keyword.split(',');
                        variables = variables.filter(pair => keywords.find(it => pair[0].startsWith(it)) != null);
                    }
                    this.variables = variables.map((pair, idx) => ({
                        id: idx,
                        name: pair[0],
                        value: pair[1]['value'],
                        isSelected: false
                    }));
                }, 3000);
            },
            onVariableSelect(variable) {
                clearInterval(this.valueWatcher);
                variable.isSelected = true;
                const valueChanger = document.querySelector(`#value-changer-${variable.id}`);
                const onKeyDown = (event) => {
                    if (variable.isSelected) {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            variable.isSelected = false;
                            valueChanger.removeEventListener('keydown', onKeyDown);
                            story.variablesState[variable.name] = variable.value;
                            this.activeValueWatcher();
                        }
                    }
                };
                valueChanger.addEventListener('keydown', onKeyDown);
            }
        }
    }

})(storyContent);
