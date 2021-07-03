var $ = require("jquery");
var _ = require("underscore");

var underkick = function (ukConfig) {
    
    var uk = {}, puk = {};
    
    ukConfig = ukConfig || {};
    puk.pluginList = _.toArray(ukConfig.pluginList);
    uk.config = ukConfig;                                   // Alias, to be used by plugins.
    
    // CONSTANTS :::::::::::::::::::::::::::::::::::::::
    puk.DEFAULT_TEMPLATE_SETTINGS = {
        evaluate:   /<%([\s\S]+?)%>/g,      // Same as underscore default.
        interpolate:/{{{([\s\S]+?)}}}/g,    // Default: /<%=([\s\S]+?)%>/g. Currently in handelbars style.
        escape:     /{{([^{][\s\S]*?)}}/g,  // Default: /<%-([\s\S]+?)%>/g. Currently in handelbars style.
        variable:   "model",
    };
    
    // MISC ::::::::::::::::::::::::::::::::::::::::::::
    puk.isPrimitive = function (x) {
        if (x === null) { return true; }
        if (typeof(x) === "object") { return false; }       // Note: typeof(array) --> 'object'
        if (typeof(x) === "function") { return false; }
        return true;
    };

    
    // FOCUS REPAIR (RENDERING-HELPERS) ::::::::::::::::
    puk.getSelector = function (el) {
        "Given an element, tries to return a unique selector for it.";
        var selector, classList, $el, dataAttrs, attrVal, hasDataAttr;
        if (el.id) { return "#" + el.id; }
        // ==> NO ID.
        selector = el.tagName;
        $el = $(el);
        dataAttrs = [
            "data-on", "data-bind", "data-to",
            "data-call", "data-arg", "data-debounce",
        ];
        _.each(dataAttrs, function (da) {
            attrVal = $el.attr(da);
            if (attrVal) {
                selector += '[' + da + '="' + attrVal + '"]';
            }
            hasDataAttr = true;
        });
        if (hasDataAttr) { return selector; }
        // ==> NO on-bind-to or on-call-arg
        classList = _.filter(el.className.split(/\s+/));
        _.each(classList, function (cls) {
            selector += "." + cls;
        });
        return selector;
    };
    puk.captureFocus = function () {
        "Tries to captures the state of the focused element.";
        var el, hasSelection;
        el = $(":focus").get(0); 
        try {
            hasSelection = el && typeof(el.selectionStart) === "number";    // Note: checkboxEl.selectionStart --> ERROR
        } catch (_error) {
            hasSelection = false;
        }
        if (hasSelection) {
            return {
                selector: puk.getSelector(el),
                selStart: el.selectionStart,
                selEnd: el.selectionEnd,
            };
        }
        return null;
    };
    puk.restoreFocus = function (focusObj) {
        "Restores focus to a previously captured state.";
        if (! focusObj) { return null; }
        $(focusObj.selector).focus().get(0).setSelectionRange(focusObj.selStart, focusObj.selEnd);
    };
    puk.repairFocusAfter = function (func) {
        "Restores focus after running the supplied function.";
        var focusObj;
        focusObj = puk.captureFocus();
        func();
        puk.restoreFocus(focusObj);
    };
    puk.repairFocusIfRequired_after = function (func) {
        "Restores focus after running `func`, __IFF__ focus was lost.";
        var focusObj_before, focusObj_after;
        focusObj_before = puk.captureFocus();
        func();
        focusObj_after = puk.captureFocus();
        if (uk.toNormalJson(focusObj_before) !== uk.toNormalJson(focusObj_after)) {
            puk.restoreFocus(focusObj_before);
            //console.log("Focus __REPAIRED__.");
        } else {
            //console.log("Focus repair __NOT__ required. " + uk.toNormalJson(focusObj_after));
        }
    };
    
    // RENDERING SUSPENSION (RENDERING-HELPERS) ::::::::
    puk.isRenderingSuspended = 0; // false.
    puk.suspendRendering = function () {
        "Suspends rendering. If already suspended, the suspension is strengthened.";
        puk.isRenderingSuspended += 1;
    };
    puk.unsuspendRendering = function () {
        "Weakens rendering supspension.";
        puk.isRenderingSuspended -= 1;
        console.assert(puk.isRenderingSuspended >= 0, "Underkick (internal): puk.isRenderingSuspended must at least be zero.");
    };
    uk.silentUpdate = function (func) {
        "Allows an observable update while rendering is suspended.";
        puk.suspendRendering();
        func();
        puk.unsuspendRendering();
    };
    
    
    // DOM PATCHING ::::::::::::::::::::::::::::::::::::
    puk.getOpenAndCloseTags = function (el) {
        "Returns [ str_openingTag, str_closingTag ].";
        var tagName, closingTagLower, outerLower,
            innerLower, closingIndex, //openingTag,
            innerIndex, unclosedOuterLower;
        if (el.innerHTML) {
            // ATTEMPT 1:                                               // Fails on <p class="foo">foo</p>
            //return el.outerHTML.split(el.innerHTML);                  // Reason: Split-result has length greater than 2.
            
            // ATTEMPT 2:                                               // Fails on <textarea>textarea</textarea>
            //innerIndex = el.outerHTML.lastIndexOf(el.innerHTML);      // Reason: Finds (lastIndexOf) innerHTML inside closing tag.
            //openingTag = el.outerHTML.slice(0, innerIndex);
            //closingTag = el.outerHTML.slice(innerIndex + el.innerHTML.length);
            //return [openingTag, closingTag];
            
            // ATTEMPT 3:
            tagName = el.tagName.toLowerCase();
            closingTagLower = "</" + tagName + ">";
            innerLower = el.innerHTML.toLowerCase();
            outerLower = el.outerHTML.toLowerCase();
            closingIndex = outerLower.lastIndexOf(closingTagLower);
            unclosedOuterLower = outerLower.slice(0, closingIndex);
            innerIndex = unclosedOuterLower.lastIndexOf(innerLower);
            
            return [
                el.outerHTML.slice(0, innerIndex),
                el.outerHTML.slice(closingIndex, el.outerHTML.length),
            ];
            
            // Note: Attempt 3 is very similar to the (below) case of empty-non-self-closing tag. TODO: Can they merge?
            
        }
        // ==> No innerHTML => Empty or self-closing tag.
        tagName = el.tagName.toLowerCase();
        closingTagLower = "</" + tagName + ">";
        outerLower = el.outerHTML.toLowerCase();
        if (outerLower.endsWith(closingTagLower)) {                 // Calling .endsWith() is necessary. `lastIndexOf` isn't enough.
            // ==> Non-self-closing tag, i.e. Proper tag.
            closingIndex = outerLower.lastIndexOf(closingTagLower);
            return [
                el.outerHTML.slice(0, closingIndex),
                el.outerHTML.slice(closingIndex, el.outerHTML.length), // Not just `closingTag`, to match any case-sensitive differences.
            ];
        }
        // ==> Self-closing tag:
        return [ el.outerHTML, "" ];
    };
    puk.getWrapper = function (node) {
        if (_.isElement(node)) {
            return puk.getOpenAndCloseTags(node)[0];
        }
        return "<" + node.nodeName + " (" + JSON.stringify(node.textContent) + ")" + ">";
    };
    puk.getState = function (node, opt_wrapper) {
        opt_wrapper = opt_wrapper || puk.getWrapper(node);
        return opt_wrapper + " #" + node.childNodes.length;
    };
    puk.stripAttrz = function (s, attrNameList) {
        "Removes the first occurence of `attrRe` in `s`.";
        var attrNameToReMap = {
            "value": / value="[^"]*"/,          // Notes: 1. There's a preceeding space. 2. The browser escapes quotes in attrs.
            "style": / style="[^"]*"/,
            "class": / class="[^"]*"/,
        };
        _.each(attrNameList, function (attrName) {
            var attrRe, matchResult, attrValue;
            console.assert(_.has(attrNameToReMap, attrName), "Assert that `attrName` is in `attrNameToReMap`.");
            attrRe = attrNameToReMap[attrName];
            matchResult = s.match(attrRe);
            if (matchResult) {
                attrValue = matchResult[0];
                s = s.split(attrValue).join("");
            }
        });
        return s;
    };
    puk.stripValueAttr = function (s) {                 // Backward compatible helper, special case of puk.stripAttrz().
        return puk.stripAttrz(s, ["value"]);
    };
    puk.specialPatchCase = {};
    puk.specialPatchCase.handleIfRootNode = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB) {
        if (nodeA === rootNode) {
            console.assert(_.isElement(nodeA) && _.isElement(nodeB), "Assert that current and new root nodes are HTML elements.");
            // ==> `nodeA` is the root node. Replace just innerHTML. The root node should __NEVER__ be removed from the DOM.
            nodeA.innerHTML = nodeB.innerHTML;
            return true;
        }
        return false;
    };
    puk.specialPatchCase.handleIfFocusedInput = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB) {
        //if(nodeA === $(":focus").get(0) && puk.stripValueAttr(stateA) === puk.stripValueAttr(stateB) && nodeA.value === nodeB.value) {
        // ^--> See Note 1 at function-end.
        
        //if (nodeA === $(":focus").get(0) && puk.stripValueAttr(stateA) === puk.stripValueAttr(stateB)) {
        // ^--> See Note 2 at function-end
        
        /*if (nodeA === $(":focus").get(0) && _.contains(["input", "textarea"], nodeA.tagName.toLowerCase())) {
            console.log("stateA = " + stateA);
            console.log("stateB = " + stateB);
            console.log("wrapperA = " + wrapperA);
            console.log("wrapperB = " + wrapperB);
        }*/
        
        if (
            nodeA === $(":focus").get(0) &&
            //puk.stripValueAttr(wrapperA) === puk.stripValueAttr(wrapperB) &&          // <-- See Note 3 at function-end.
            puk.stripAttrz(wrapperA, ["value", "style"]) === puk.stripAttrz(wrapperB, ["value", "style"]) &&
            _.contains(["input", "textarea"], nodeA.tagName.toLowerCase())// &&
        ) {
            // ==> nodeA is focused and similar to nodeB. => Do nothing.
            return true;
        }
        return false;
        
        //  Note 1: What about `nodeA.value === nodeB.value`?
        //  -------------------------------------------------
        //  
        //  Originally, the special-case-check condition
        //  included the check `nodeA.value === nodeB.value`.
        //
        //  It was removed when debouncing was introduced.
        //
        //  That's coz due to debouncing, nodeA.value
        //  may lead (i.e. be different from) nodeB.value.
        
        
        //  Note 2: Why check wrapper instead of state?
        //  -------------------------------------------
        //
        //  A blank textarea has 0 children. A filled
        //  textarea has exactly 1 child. Thus, when in
        //  a textarea, if you Ctrl+A & Backspace, the
        //  state changes as we go from 1 to 0 children.
        //
        //  Thus, instead of checking for:
        //      puk.stripValueAttr(stateX)
        //  we check for:
        //      puk.stripValueAttr(wrapperX)
        //  _AND_ additionally check to ensure that
        //  the focused node is an <input> or <textarea>.
        
        /*  Note 3: Why stripping style attr?
            ---------------------------------
            
            When a textarea is resized by the user, its
            style attribute changes to reflect the new
            height and width.
            
            If a focused textarea is resized, then its
            style attr and hence it's wrapper would
            change, causing it to be re-rendered and
            thus loosing focus.
            
            The perfect way to prevent this would be
            to strip just the height and width styles
            before comparing wrappers, but practially,
            stripping the entire style attr should work.
            
            That's because given debouncing, it's would
            be unwise to make intentional changes to a
            focused textarea's style, while the user was
            typing.
            
            TODO: Consider stripping just height & width.
        */

    };
    puk.checkIfGoodHtml = function (html) {
        var tmpDiv = document.createElement("DIV");
        tmpDiv.innerHTML = html;                            // On setting innerHTML, the browser fixes any mistakes in it.
        return Boolean(tmpDiv.innerHTML === html);          // No changes imples there were no mistakes, which implies all is good.
    };
    puk.subSpecialPatchCase_containedInnerHtml = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB) {
        var innerA, innerB, startIndex, endIndex,
            preCommonInner, commonInner, postCommonInner, $nodeA;
        innerA = nodeA.innerHTML;
        innerB = nodeB.innerHTML;
        if (! uk.strContains(innerB, innerA)) {
            return false;   // Short ckt.               // False => special_sub_case's patching didn't work.
        }
        startIndex = innerB.indexOf(innerA);            // Inclusive index.
        console.assert(startIndex >= 0, "puk.subSpecialPatchCase_containedInnerHtml(): Assert that startIndex is non-negative.");
        endIndex = startIndex + innerA.length - 1;      // Inclusive index.
        preCommonInner = innerB.slice(0, startIndex);
        if (! puk.checkIfGoodHtml(preCommonInner)) {
            return false;   // Short ckt.
        }
        commonInner = innerA;
        console.assert(commonInner === innerB.slice(startIndex, endIndex + 1), "uk: Assert commonInner is proper slice of innerB.");
        //console.assert(puk.checkIfGoodHtml(commonInner), "uk: Assert commonInner satisfies puk.checkIfGoodHtml()."); //Use if instead.
        if (! puk.checkIfGoodHtml(commonInner)) {
            // For ill-formated tables, commonInner tends to often not statisfy puk.checkIfGoodHtml.
            // Thus, instead of asserting that it must satisfy, we simply simply short circuit and avoid using this optimization.
            return false;   // Short ckt.
        }
        postCommonInner = innerB.slice(endIndex + 1);
        if (! puk.checkIfGoodHtml(postCommonInner)) {
            return false;   // Short ckt.
        }
        // ==> preCommonInner AND postCommonInner are both GOOD (well-formed and complete) html strings.
        $nodeA = $(nodeA);
        if (preCommonInner) { $nodeA.prepend(preCommonInner); }
        if (postCommonInner) { $nodeA.append(postCommonInner); }
        return true;
    };
    puk.specialPatchCase.handleIfSameWrapper = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB) {
        var shouldAvoidUpdate, funcPath, checkIfShouldAvoidUpdate;
        if (! (wrapperA === wrapperB && _.isElement(nodeA) && _.isElement(nodeB))) {
            return false;
        }
        // ==> `nodeA` has a the same wrapper as `nodeB`
        //      => Replace just innerHTML, or if so advised, do nothing.
        shouldAvoidUpdate = $(nodeA).data("shouldAvoidUpdate");
        // As wrappers are same, this will be the same for `nodeB`.
        
        if (shouldAvoidUpdate) {
            // ==> Explicit update instruction provided.
            if (shouldAvoidUpdate === true) {
                // ==> Explicitly instructed avoid element update (via direct boolean value). Do nothing.
                return true;
            }
            if (_.isString(shouldAvoidUpdate)) {
                // ==> Update instruction seems to be provided in the form of a path to a function in the model.
                funcPath = shouldAvoidUpdate;                               // Path to the function in the model.
                checkIfShouldAvoidUpdate = puk.refineModel(funcPath, model);
                if (_.isFunction(checkIfShouldAvoidUpdate)) {
                    if (checkIfShouldAvoidUpdate()) {
                        // ==> Explicit instruction to avoid an update (via callback's return value). Do nothing.
                        return true;
                    }
                    // ==> Explicit instruction to __NOT__ avoid an update. Update:
                    nodeA.innerHTML = nodeB.innerHTML;
                    return true;
                }
            }
            // ==> Unexpected update instruction. Neither falsy, nor `true`, nor a model-path to a function.
            throw new Error("Underkick: `data-should-avoid-update` must be a boolean or a path to a function. It's neither.");
        }
        // ==> No instruction about avoiding an update given (=undefined) or explicitly asked to not update (=false).
        
        if (puk.subSpecialPatchCase_containedInnerHtml(nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB)) {
            //console.log("containerInnerHtml opti used.");
            return true;
        }
        
        // ==> No sub-special case satisfied. Simply replacing innerHTML (as oppsed to the entire (outer) node.)
        nodeA.innerHTML = nodeB.innerHTML;
        
        //  Note1:
        //  ======
        //  This step (innerHTML update) was originally thought of as an optimization. But its infact an algorithmic necessity.
        //  When it comes to __FOCUSED__ textareas, this is a rather important step.
        //  
        //  It turns out that textareas have innerHTML. Empty textareas have no children.
        //  Non-empty textareas have one childNode: a text node.
        //  
        //  Replacing the innerHTML of a focused textarea does __NOT__ lead to loss of focus.
        //  But if we simply replace the textarea area (with a new textarea), focus would be lost.
        //  
        //  So this step, wherein we try to replace (just the) innerHTML as opposed to the entire node is important.
        //  Without it, we'd need some form of focus repair.
        //
        //  Note2:
        //  ======
        //  When dealing with 3rd party libraries, it may be very difficult to make the UI a strict function of the model.
        //  An example is Trumbowyg. The WYSIWYG interface needs to be initialized using library-specific javascript.
        //  Trying to capture the state of the editor into the model and making the UI a state of that model would be hard.
        //  
        //  It would be much easier, if underkick could be instructed not to patch an element, as long as the
        //  corresponding new-element to be rendered has the same wrapper (but not necessarily the same number of children.)
        //  The attribute `data-should-update-element` allows one to issue just such an instruction to underkick.

    };
    puk.specialPatchCase.handleIfSameInnerHtml_opti = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB) {
        // Note: The suffix '_opti' stands for 'optimization'. This is a (non-necessary, but useful) optimization.
        var $nodeA, $nodeB;
        if (nodeA.innerHTML && nodeB.innerHTML && (nodeA.innerHTML === nodeB.innerHTML)) {
            // ==> Both nodes are innerHTML-ful elements and differ only in outer wrapper.
            if (puk.stripAttrz(wrapperA, ["style", "class"]) === puk.stripAttrz(wrapperB, ["style", "class"])) {
                // ==> Difference in the out wrapper is only in the 'style' and/or 'class' attributes.
                $nodeA = $(nodeA);
                $nodeB = $(nodeB);
                if ($nodeA.attr("style") !== $nodeB.attr("style")) {
                    $nodeA.attr("style", $nodeB.attr("style"));
                }
                if ($nodeA.attr("class") !== $nodeB.attr("class")) {
                    $nodeA.attr("class", $nodeB.attr("class"));
                }
                return true;
            }
            // ==> 'style' and/or 'class' attrs are different. Optimization-case not satisfied.
        }
        return false;
        //  Note:
        //  -----
        //  A central part of this optimization is the aspect that
        //  an element's "style" attribute and `.style` property are
        //  always in sync with each other. This is also true about
        //  the element's  "class" attribute and `.className` property.
    };
    // TODO: optimizations should be multi-usable. Like the above one and then the one below.
  /*puk.specialPatchCase.handleIfSameInnerHtmlStart_opti = function (nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB){
        var childListA, childListB;
        if (
        if (! (nodeA.innerHTML && nodeB.innerHTML && nodeA.innerHTML.trim() && nodeB.innerHTML.trim()) {
            return false;
        }
        // ==> Both elements have truthy 'innerHTML'.
        if (! nodeB.innerHTML.trim().startsWith(nodeA.innerHTML.trim())) {
            return false;
        }
        // ==> New node's (nodeB's) trimmed innerHTML starts with that of nodeA's.
        //     => NodeB contains all the child-nodes in nodeA, and other ones, in that order.
    };*/
    puk.patchNode = function (nodeA, nodeB, rootNode, model) {
        var wrapperA, wrapperB, stateA, stateB,
            childListA, childListB, specialPatchCaseArgList;
        if (nodeA.outerHTML && nodeA.outerHTML === nodeB.outerHTML) {
            // ==> [Optimization] Patch not required.
            return null;
        }
        wrapperA = puk.getWrapper(nodeA);
        wrapperB = puk.getWrapper(nodeB);
        stateA = puk.getState(nodeA, wrapperA);
        stateB = puk.getState(nodeB, wrapperB);
        specialPatchCaseArgList = [nodeA, nodeB, rootNode, model, stateA, stateB, wrapperA, wrapperB];
        if (stateA !== stateB) {
            // ==> Nodes have different states. => Apply patch at the current level.
            if (puk.specialPatchCase.handleIfRootNode.apply(null, specialPatchCaseArgList)) { return null; }
            if (puk.specialPatchCase.handleIfFocusedInput.apply(null, specialPatchCaseArgList)) { return null; }
            if (puk.specialPatchCase.handleIfSameWrapper.apply(null, specialPatchCaseArgList)) { return null; }
            if (puk.specialPatchCase.handleIfSameInnerHtml_opti.apply(null, specialPatchCaseArgList)) { return null; }
            // ==> No special condition satisfied.
            $(nodeA).replaceWith(nodeB);                // Internally uses parentElement.replaceChild(), not innerHTML.
            //console.log("Replaceing node.");
            return null;
        }
        // ==> The nodes are in the SAME state. => Compare children and patch them as required.
        childListA = _.toArray(nodeA.childNodes);
        childListB = _.toArray(nodeB.childNodes);       // Recursive calls change the node trees. Save initial references to children.
        _.each(childListA, function (childA, i) {
            puk.patchNode(childA, childListB[i], rootNode, model);
        });
        return null;
    };
    
    // RENDERING (THE HOLY GRAIL) ::::::::::::::::::::::
    puk.onRenderList = [];
    puk.logOnRenderWarning = _.once(function () {
        console.log("Underkick: Using .onRender() is generally illadvised. Use it __only__ if you must.");
    });
    puk.onRender = function (func) {
        puk.logOnRenderWarning();
        puk.onRenderList.push(func);
    };
    uk.onRender = function (func) {
        puk.onRender(func);
    };
    puk.onNextRenderList = [];  // Same as puk.onRenderList, but is emptied out after each iteration, so that listener runs only once.
    puk.onNextRender = function (func) {
        puk.onNextRenderList.push(func);
    };
    uk.onNextRender = function (func) {
        puk.onNextRender(func);
    };
    puk.onBeforeRenderList = []; // puk.onRenderList's dual.
    puk.onBeforeRender = function (func) {
        // TODO: Ponder over the use cases and implications of .onBeforeRender(). Can you think of a better name?
        console.log("Underkick: Use .onBeforeRender() carefully. Its a new addition and its API may change abruptly.");
        puk.onBeforeRenderList.push(func);
    };
    uk.onBeforeRender = function (func) {
        puk.onBeforeRender(func);
    };
    puk.isRenderedVersionStale = 0;  // false;
    puk.render = function (model, tplFunc, dstElm, dstOpenAndCloseTags) {
        "Basic rendering function.";
        var newInnerHtml, nodeB;
        if (! puk.isRenderingSuspended) {
            newInnerHtml = tplFunc(model); 
            nodeB = $(dstOpenAndCloseTags.join(newInnerHtml)).get(0);
            _.each(puk.onBeforeRenderList, function (func) {
                func(nodeB);
            });
            
            //puk.repairFocusIfRequired_after(function () {
                puk.patchNode(dstElm, nodeB, dstElm, model);
            //});
            
            _.each(puk.onRenderList, function (func) {
                func();
            });
            
            if (puk.onNextRenderList.length) {
                _.each(puk.onNextRenderList, function (func) {
                    func();
                });
                puk.onNextRenderList = [];              // Emptied out each time, so that listener runs only once when pushed, per push.
                // TODO: If puk.onNextRender() is called withing a next-render-listener, added-listener gets emptied before it is run.
                //       Fix this by maintaining an internal state of listeners that have been run, and empty-out only those.
            }
            
            puk.isRenderedVersionStale = 0;  // false;
        } else {
            puk.isRenderedVersionStale += 1; // true;
        }
    };
    puk.reRender = null;
    puk.firstRender = function (model, srcId, dstId, settings) {
        var tplStr, tplFunc, dstElm, dstOpenAndCloseTags;
        settings = $.extend(
            {},
            puk.DEFAULT_TEMPLATE_SETTINGS,
            settings//,
        );
        tplStr = $("#" + srcId).html();
        tplFunc = _.template(tplStr, settings);
        
        window.tplFunc = tplFunc;   // TMP TODO
        window.tplStr = tplStr;
        
        dstElm = $("#" + dstId).get(0);
        dstOpenAndCloseTags = puk.getOpenAndCloseTags(dstElm);
        
        puk.firstRender.settings = settings;            // For components to work, this must be avaible before calling puk.render();
        
        // XXX:TODO: Set puk.firstRender.model __before__ first call to puk.render,
        //              as otherwise, uk.refine (and other methods) that use puk.firstRender.model
        //              as a default value WILL NOT WORK.
        
        // Render:
        puk.render(model, tplFunc, dstElm, dstOpenAndCloseTags);
        
        // Define the re-renderer:
        console.assert(! puk.reRender, "Underkick (internal): Assert that puk.reRender is not already defined.");
        puk.reRender_unthrottled = function () {
            puk.render(model, tplFunc, dstElm, dstOpenAndCloseTags);
        };
        if (_.isNumber(ukConfig.throttleWait) && ukConfig.throttleWait > 0) {
            //puk.reRender = _.throttle(puk.reRender_unthrottled, ukConfig.throttleWait);
            puk.reRender = puk.debounce(function () {
            
                puk.reRender_unthrottled();
            }, ukConfig.throttleWait);
        } else {
            puk.reRender = puk.reRender_unthrottled;
        }
        // Note: Even if throttling is used, calling uk.updateUI(isUrgent=true) leads to unthrottled (urgent) rerendering.
        
        // Remember the firstRender's configuration:
        puk.firstRender.model = model;
        puk.firstRender.srcId = srcId;
        puk.firstRender.dstId = dstId;
        //puk.firstRender.settings = settings;          // Moved up (to before the call to puk.render())
        puk.firstRender.tplFunc = tplFunc;
        puk.firstRender.dstElm = dstElm;
        
        // Call all the firstRender.after subscribers:
        _.each(puk.firstRender.afterSubscriberList, function (func) {
            func();
        });
    };
    puk.firstRender.afterSubscriberList = [];
    puk.firstRender.after = function (func) {
        if (! puk.reRender) {
            // ==> Not yet rendered. Add to subscriber list.
            puk.firstRender.afterSubscriberList.push(func);
        } else {
            // ==> Already rendered, no reason to wait.
            return func();
        }
    };
    uk.afterFirstRender = function (func) {                                     // Used by plugins, notably, underkick_jsonRouter
        return puk.firstRender.after(func);
    };
    uk.render = function (model, srcId, dstId, settings) {
        settings = settings || {};
        if (_.isString(settings)) {
            settings = { "variable": settings };
        }
        settings.variable = settings.variable || "model";
        
        if (puk.reRender) {
            // ==> Already rendered once before.
            throw new Error(".render() called more than once. Call .updateUi() instead.");
        }
        // ==> Not rendered yet.
        if (arguments.length < 3) {
            // ==> Insufficient arguments.
            throw new Error(".render() called with less than 3 arguments.");
        }
        // ==> Not yet rendered, sufficient arguemnts;
        puk.firstRender(model, srcId, dstId, settings);
        console.log("Underkick: Finished (first) rendering!");
    };
    uk.updateUi = function (isUrgent/*=false*/) {
        isUrgent = isUrgent || false;
        console.assert(puk.reRender, "ERROR: .updateUi() called before calling .render().");
        console.assert(puk.reRender_unthrottled, "ERROR: .updateUi() called before calling .render().");
        if (! isUrgent) {
            puk.reRender();
        } else {
            puk.reRender_unthrottled();
        }
    };
    puk.batchUpdate = function (func) {
        "Suspends rendering while calling the supplied func. Then brings about one render.";
        puk.suspendRendering();
        func();
        puk.unsuspendRendering();
        if (puk.isRenderedVersionStale) {
            puk.reRender();
        }
        return uk;
    };
    uk.batchUpdate = function (func) {
        puk.batchUpdate(func);
    };
    puk.batchify = function (func) {
        "A decorator for batch updating.";              // Written independently of puk.batchUpdate(.).
        return function (/*arguments*/) {
            var args, retVal;
            args = _.toArray(arguments);
            puk.suspendRendering();
            retVal = func.apply(null, args);
            puk.unsuspendRendering();
            if (puk.isRenderedVersionStale) {
                puk.reRender();
            }
            return retVal;
        };
    };
    uk.batchify = function (func) {
        return puk.batchify(func);
    };


    // EVENT-LISTENING :::::::::::::::::::::::::::::::::
    puk.listenerList = [];
    puk.listen = function (eventStr, selector, handler) {
        /*puk.listenerList.push({
            selector: selector,
            eventStr: eventStr,
            handler: handler,
        });*/
        puk.firstRender.after(function () {
            var $dst;
            if (! ukConfig.listenTarget) {
                $dst = $("#" + puk.firstRender.dstId);
                $dst.on(eventStr, selector, handler);
            } else {
                $(ukConfig.listenTarget).on(eventStr, selector, handler);
                // To work with bootbox alerts, `ukConfig.listenTarget` may be outside the render target.
            }
        });
    };
    uk.listen = function (eventStr, selector, handler) {
        puk.listen(eventStr, selector, handler);
    };
    
    // Notes (wrt the handler passed to uk.listen):
    //  1. The element that fired the event is available as event.target.
    //  2. The element where the event is being delivered is available as event.currentTarget.
    //  3. The currentTarget is also available as the `this` keyword.
    //  4. If using _.bind(), $.proxy() or similar, the `this` keyword points to the bound context, not event.currentTarget.
    //  
    //  5. The signature of the handler is handler(event, extra1, extra2 ...);
    //  6. Extra parameters passed through $().trigger() are passed to the handler (directly by jQuery.)


    
    // OBSERVABLES :::::::::::::::::::::::::::::::::::::
    uk.observable = function (initVal) {
        var ob, pob = {};
        pob.val = initVal;
        pob.subscriberList = [];
        ob = function (newVal, atPath) {
            if (arguments.length === 0) { return ob.get(); }
            return ob.set(newVal, atPath);
        };
        ob.get = function () { return pob.val; };
        ob.subscribe = function (func) {
            pob.subscriberList.push(func);
            return ob;
        };
        ob.unsubscribe = function (func) {
            pob.subscriberList = _.without(pob.subscriberList, func);
            return ob;
        };
        ob.notify = function () {
            _.each(pob.subscriberList, function (func) {
                func(ob.get());                                 // Note: ob.get() get's the latest (new) value.
            });                                                 // Thus, subscriber has signature: function (newVal) {...};
            return ob; // Chaining                              // Also, subscriber may itself call ob.get() to get newVal.
        };
        ob.simpleSet = function (newVal) {
            var oldVal = pob.val;
            if (oldVal === newVal && puk.isPrimitive(newVal)) {
                return ob;  // Short ckt.
            }
            // Othewise...
            pob.val = newVal;                                   // After this line of code, ob.get() --> newVal.
            return ob.notify();
        };
        ob.deepSet = function (newInnerVal, atPath) {                           // `atPath` should be relative to `ob`.
            var refined, oldInnerVal;
            refined = puk.refineModelToPenultimate(atPath, ob.get());
            // ^-- `ob.get()` is req'd for first-level-deep setting.
            oldInnerVal = refined.penultimate[refined.lastKey];
            if (oldInnerVal == newInnerVal && puk.isPrimitive(newInnerVal)) {
                return ob;  // Short ckt.
            }
            refined.penultimate[refined.lastKey] = newInnerVal;                 // Update the underlying object.
            return ob.notify();
        };
        ob.set = function (newVal, atPath) {
            if (_.isUndefined(atPath)) {
                return ob.simpleSet(newVal);
            }
            return ob.deepSet(newVal, atPath);
        };
        ob.isObservable = true;
        ob.subscribe(function () {
            if (puk.reRender) { puk.reRender(); }
        });
        ob.pob = pob;   // Debug line.
        return ob;      // Export.
    };
    uk.computed = function (cFunc, defaultDepList) {
        var co, pco = {"depList": []};
        defaultDepList = defaultDepList || [];
        
        console.assert(typeof(cFunc) === "function", "The computee passed to an computed observable must be of type 'function'.");
        console.assert(_.isArray(defaultDepList), "The `defaultDepList` passed to an computed observable must be an array.");
        
        co = uk.observable(cFunc(null));                // For the first computation, oldComputedVal is passed as `null`.
        pco.set = co.set;                               // Save the setter in a private variable.
        delete co.set;                                  // Remove the setter from the computed itself.
        
        pco.cFunc = function () {
            pco.set(cFunc());                           // Note: cFunc() may get computed's soon-to-bo-previous value via computed.get();
            return null;
        };
                    
        // Optimized computation:
        // ----------------------
        //  If heavy computation is involved, eg. a
        //  sorted list of 1000+ messages, then the
        //  computed's previous value may be used to
        //  optimally compute the new value.
        //
        //  In the computation function, calling
        //  computed.get() will get the computed's
        //  then current value; which will shall be
        //  the previous value upon the computed's return.
        //
        //  In no event can a computed depend on itself,
        //  as that'd potentially be infinitely recursive.
        //  However, a compute'd computation function
        //  can use computed.get() to access it's then
        //  current, but soon-to-be previous value.
        
        co.addDependency = function (dep) {
            pco.depList.push(dep);
            dep.subscribe(pco.cFunc);
            return co;  // Chainable
        };
        _.each(defaultDepList, co.addDependency);       // Important: Each default dependency is added here.
        
        co.removeDependency = function (dep) {
            dep.unsubscribe(pco.cFunc);
            pco.depList = _.without(pco.depList, dep);
            return co;  // Chainable
        };
        co.flushDependencies = function () {
            while (pco.depList.length) {
                co.removeDependency(pco.depList[0]);
            }
            return co;  // Chainable
        };
        co.resetDependencies = function () {
            co.flushDependencies();
            _.each(defaultDepList, co.addDependency);
            return co;  // Chainable
            // Note: Flushing dependencies is important.
            // Just setting pco.depList = [] is not enough,
            // because then previous dependencies
            // will still have a reference to pco.cFunc,
            // via their subscriberList. In other words,
            // although pco.depList will be emtpy, the
            // old subscriptions will continue to exist.
        };
        
        /*co.recompute = function () {                  -- Commented out, along with uk.overridableComputed.
            pco.cFunc();
            return co;  // Chainable
        };*/
        
        co.isComputed = true;
        co.pco = pco;         // Debug line.
        return co;
    };
    /*uk.overridableComputed = function (cFunc, defaultDepList, shouldAutoUnoverride) {
        var oco, poco = {};
        console.warn("Using overridable computes is generally ill-advised. This is an experimental feature of underkick.js");
        if (_.isUndefined(shouldAutoUnoverride)) {
            shouldAutoUnoverride = true;
        }
        poco.isOverridden = false,                      // Non-observable
        poco.overriddenVal = null;                      // Non-observable
        poco.cFunc = function () {
            if (poco.isOverridden) {
                if (shouldAutoUnoverride) {
                    // shouldAutoUnoverride => overriding should last only until next computation of computed.
                    poco.isOverridden = false;          // Ensures `poco.isOverridden` will be `false` in the next computation.
                }
                return poco.overriddenVal;
            }
            // ==> No override active.
            return cFunc();
        };
        oco = uk.computed(poco.cFunc, defaultDepList);
        oco.override = function (overriddenVal) {
            poco.isOverridden = true;
            poco.overriddenVal = overriddenVal;         // Not using observable, as observable.set() doesn't always .notify().
            oco.recompute();                            // First computation, post-override.
            return oco; // Chainable
        };
        oco.unoverride = function () {                  // Should be used when shouldAutoUnoverride is falsy.
            poco.isOverridden = false;
            oco.recompute();
            return oco; // Chainable
        };
        
        oco.isOverridable = true;
        oco.poco = poco;        // Debug aid.
        return oco;
        /*
            How Overridden Observables Work             // When shouldAuthUnoverride is truthy.
            ================================
            
            Each time any dependency changes, poco.cFunc fires. And each call to poco.cFunc ensures that
            for the next call to poco.cFunc, poco.isOverridden will be false.
            
            Thus, the effect of overriding lasts only until the next computation cycle, which gets
            triggered upon any underlying observable changing.
            
            Additionally, the next computation cycle can also be manually triggered via oco.unoverride().
            
            Note that poco.isOverridden is non-observable. The only way to make it truthy is by calling
            oco.override(). Now, oco.override(), aprt from setting poco.isOverriden to true and setting
            poco.overriddenVal, triggers the first post-override computation via oco.recompute.
        *x/
    };*/
    uk.observableArray = function (initArr) {
        var ob, pob = {}, augmentArrFunc;
        ob = uk.observable(null);
        pob.simpleSet = ob.simpleSet;           // Save reference to original simpleSet().
        ob.simpleSet = function (arr) {         // Redifine simpleSet, asserting array.
            if (! _.isArray(arr)) {
                throw new Error("Cannot set an observableArray's value to a non-array.");
            }
            return pob.simpleSet(arr);
        };
        ob.set(initArr);                        // Ensures that initArr is an arr. (As just 1 arg passed, this is simpleSet().)
        ob.native = function (key/*, nativeArg1, nativeArg2, ... */) {
            var arr, nativeArgs, retVal;
            arr = ob.get();
            nativeArgs = _.toArray(arguments).slice(1); // a.native("push", 10) --> { arr = a.get(); arr.push.apply(arr, [10]); }
            retVal = arr[key].apply(arr, nativeArgs);
            ob.set(arr);
            return retVal;
        };
        augmentArrFunc = function (key) {
            ob[key] = function (/*, nativeArg1, nativeArg2, ... */) {
                var args = _.toArray(arguments);
                return ob.native.apply(null, [key].concat(args));           // ob.native doesn't use `this`. So here, we set it to null.
            };                                                              // obArr.indexOf('foo') --> obArr.native('indexOf', 'foo');
        };
        _.each(
            [   "indexOf", "slice","push", /*"pop",*/ "unshift",
                "shift", "reverse", "sort", "splice",
                "lastIndexOf",
            ],
            augmentArrFunc//,
        );
        ob.without = function (x) {
            return ob.set(_.without(ob.get(), x));
        };
        ob.pop = function (index) {
            var removedItemList;
            index = index || (ob.get().length - 1);
            removedItemList = ob.splice(index, 1);                          // Splice-remove 1 item at `index`.
            console.assert(removedItemList.length === 1, "Assert that only 1 item is popped from observable array.");
            return removedItemList[0];
        };
        ob.insert = function (index, x) {
            var removedItemList = ob.splice(index, 0, x);                   // Remove no items, insert `x`, at `index`.
            console.assert(removedItemList.length === 0, "Assert that no items were removed from observable array.");
            return null;                                                    // pyList.insert -> null.
        };
        ob.isObservableArray = true;
        return ob;
    };
    //
    uk.observableDocMap = function (sortKey) {           // `sortKey` is passed to _.sortBy as is, so it could be a str or func.
        var oDocMap = uk.observable({});
        
        oDocMap.updateOne = function (doc) {
            let docMap = oDocMap.get();
            let oldDoc = docMap[doc._id] || null;           // <-- Previously stored value corresponding to doc._id.
            if (_.isEqual(oldDoc, doc)) {
                //console.log(uk.toPrettyJson[oldDoc, doc]);
                return null;    // Short ckt.               // <-- Needn't update oDocMap if `oldDoc` is same as `doc`.
            }
            // ==> Need to update:
            docMap[doc._id] = doc;
            oDocMap(docMap);        // Update observably
        };
        oDocMap.updateMany = function (docList) {           // For adding (updatating) multiple docs into docMap, in one fell swoop.
            let docMap = oDocMap.get();                     // Far more efficient than using _.each() w/ docMap.updateOne().
            _.each(docList, function (doc) {
                docMap[doc._id] = doc;
            });
            oDocMap(docMap);    // Update observably
        };
        oDocMap.list = uk.computed(
            function () {
                if (! sortKey) { return _.values(oDocMap.get()); }      // Short ckt.
                return _.sortBy(_.values(oDocMap.get()), sortKey);
            },
            [oDocMap],
        );
        
        oDocMap.pop = function (docId) {
            if ($.isPlainObject(docId) && docId._id) {
                docId = docId._id;
            }
            console.assert(_.isString('docId'), "Assert `docId` is string.");
            let docMap = oDocMap.get();
            let doc = docMap[docId];
            let didDelete = delete docMap[docId];
            console.assert(didDelete, "Assert docId was successfully deleted.");
            oDocMap(docMap);    // Update observably
            return doc;
        };
        
        oDocMap.isFetched = uk.observable(false);
        
        oDocMap.reset = function () {
            oDocMap.set({});
            oDocMap.isFetched.get(false);
            return oDocMap; // Chainable
        };
        oDocMap.resetAndRecover = function () {
            let docMap = oDocMap.get();
            let isFetched = oDocMap.isFetched.get();
            oDocMap.reset().set(docMap);
            oDocMap.isFetched.set(isFetched);
            return oDocMap; // Chainable
        };
        
        return oDocMap;
    };
    uk.observableBool = function (initVal) {
        console.assert(_.isBoolean(initVal), "Assert `initVal` is boolean.");
        var oBool = uk.observable(initVal);
        oBool.toggle = function () {
            return oBool.set(! oBool.get());
        };
        return oBool;
    };


    uk.observableTracker = function (obOrCob) {
        // Returns a computed observable that depends
        //  on and tracks the supplied observable.
        //  The supplied observable may itself be
        //  a computed observable.
        console.assert(obOrCob.isObservable && obOrCob.get, "Assert that the observable to track is indeed an observable.");
        return uk.computed(function () {
            return obOrCob.get();
        }, [obOrCob]);
    };
    
    // OBSERVABLE-USAGE HELPERS ::::::::::::::::::::::::
    uk.unwrap = function (x) {
        "One-level unwrapping. (Non-recursive unwrapping.)";
        if (x.isObservable && x.get) {
            return x.get();
        }
        return x;
    };
    uk.toJs = function (x) {
        "Recursive (deep) unwrapping.";
        //if (! x) { return x; }  // TODO: Better use `puk.isPrimitive(x)`  ---- DONE ----
        if (puk.isPrimitive(x)) { return x; }
        if (x.isObservable && x.get) { return uk.toJs(x.get()); }
        if (_.isArray(x)) { return _.map(x, uk.toJs); }
        if ($.isPlainObject(x)) { return _.mapObject(x, uk.toJs); }
        return x;
    };
    uk.snapshot = uk.toJs;      // Conceptual alias.
    uk.toJson = function (x) { return JSON.stringify(uk.toJs(x)); };
    uk.fromJson = JSON.parse;
    uk.toPrettyJson = function (x, indent) {
        indent = indent || 4;
        var spacing = _.map(_.range(indent), function () { return " "; }).join("");
        return JSON.stringify(uk.toJs(x), null, spacing);
    };
    uk.deepCopy = function (x) {
        "Very similar to, but not the same as, `uk.toJs`.";
        if (puk.isPrimitive(x)) { return x; }
        //if (x.isObservable && x.get) { return uk.deepCopy(x.get()); }     -- Observables are not expected. Call uk.snapshot before.
        if (_.isArray(x)) { return _.map(x, uk.deepCopy); }
        if ($.isPlainObject(x)) { return _.mapObject(x, uk.deepCopy); }
        throw new Error("Deep copying failed. Couldn't copy non-JSON-serializable object " + String(x));
    };
    uk.deepClone = uk.deepCopy; // Obvious alias.
    uk.toNormalJs = function (x) {
        "Like uk.toJs(), but far more helpful in __comapring__ JSON objects.";
        var y = {};
        if (puk.isPrimitive(x)) {
            return x;
        }
        if (x.isObservable && x.get) {
            return uk.toSortedJs(x.get());
        }
        if (_.isArray(x)) {
            return _.map(x, uk.toSortedJs);
        }
        if ($.isPlainObject(x)) {
            // Adding key-value pairs by the keys' sort order:
            _.each(_.sortBy(_.keys(x)), function (key) {
                y[key] = uk.toSortedJs(x[key]);
            });
            return y;
        }
        return x;
    };
    uk.toSortedJs = uk.toNormalJs;      // Slang alias.
    uk.toNormalJson = function (x) {
        return JSON.stringify(uk.toSortedJs(x));
    };
    uk.toSortedJson = uk.toNormalJson;  // Slang alias.
    uk.haveSameJson = function (/**/) {
        var args, baseJson;
        args = _.toArray(arguments);
        baseJson = uk.toSortedJson(args.pop());
        return _.all(args, function (arg) {
            return uk.toSortedJson(arg) === baseJson;
        });
    };
    uk.mkExtend = function (iteratee) {
        return function (src/*, dstList*/) {
            var isSrcObv, plainTopSrc, dstList;
            if (src.isComputed && src.get) {
                throw new Error("uk.extend:: The source object may not be a computed observable.");
            }
            isSrcObv = (src.isObservable && src.get);
            if (isSrcObv) {
                plainTopSrc = src.get();                // It is itself not an observable, but may contain internal observables.
            } else {
                plainTopSrc = src;
            }
            dstList = _.toArray(arguments).slice(1);
            if (iteratee) {
                dstList = _.map(dstList, iteratee);
            }
            _.extend.apply(null, [plainTopSrc].concat(dstList));
            if (isSrcObv) {
                src.set(plainTopSrc);
            } else {
                src = plainTopSrc;
            }
            return src;
        };
    };
    uk.extend = uk.mkExtend(null);                      // Destination objects are __NOT__ unwrapped or pre-converted to JSON etc.
    uk.deepExtend = uk.mkExtend(uk.deepCopy);           // Destination objects are deep copyed. There is __NO__ unwrapping involved.
    uk.unwrapExtend = uk.mkExtend(uk.unwrap);           // Destination objects are 1-level-unwrapped (if they are observable.)
    uk.snapExtend = uk.mkExtend(uk.snapshot);           // Destination objects are deep-unwrapped (if they are observable.)
    uk.deepSnapExtend = uk.mkExtend(_.compose(
        uk.deepCopy, uk.snapshot//,                     // Note: _.compose(g, h) ==> g(h(.))
    ));
    uk.observify = function (x) {
        if (puk.isPrimitive(x)) {
            // "foo" --> uk.observable("foo"); { written o("foo") below };
            return uk.observable(x);
        }
        if (_.isArray(x)) {
            // ["foo", "bar"] --> oArray([o("foo"), o("bar")]);
            return uk.observableArray(_.map(x, uk.observify));
        }
        if ($.isPlainObject(x)) {
            // {"foo": "bar"} --> o({"foo": o("bar")})
            return uk.observable(_.mapObject(x, uk.observify));
        }
        // Anything else remains unchanged.
        return x;
    };
    
    puk.debounce = function (funcIn, waitPeriod) {              // XXX:Notes:: Refer underkick-debounce-notes.txt
        var latest, funcOut, isTimeoutSet;
        
        latest= {};
        latest.callAt = 0;
        latest.context = null;
        latest.argList = [];
        latest.retVal = null;
        
        isTimeoutSet = false;
        funcOut = function (/*arguments*/) {
            var delta, TS_NOW;
            TS_NOW = Date.now();
            delta = TS_NOW - latest.callAt;
            latest.callAt = TS_NOW;
            latest.context = this;
            latest.argList = _.toArray(arguments);
            if (delta >= waitPeriod) {
                // ==> No need to wait any more. Call now!
                latest.retVal = funcIn.apply(latest.context, latest.argList);
            } else if (! isTimeoutSet) {
                // ==> Need to wait. Schedule a call.
                isTimeoutSet = true;
                window.setTimeout(function () {
                    isTimeoutSet = false;
                    funcOut.apply(latest.context, latest.argList);
                    // We use the __then__ latest.context and the __then__ latest.argList.
                }, waitPeriod);
            }
            // In either case:
            return latest.retVal;
        };
        return funcOut;
    };
    uk.debounce = function (funcIn, waitPeriod) {
        return puk.debounce(funcIn, waitPeriod);
    };
    
    // BINDING HELPERS:
    puk.pathToKeyList = function (path) {
        var sep = path[0];
        return path.split(sep).slice(1);                    // ".foo.bar" --> ["", "foo", "bar"] --> ["foo", "bar"]
    };
    puk.refineModel = function (pathOrKeyList, obj, isRecursiveCall) {
        var keyList, key;
        if (! isRecursiveCall) {
            // ==> First call.
            obj = obj || puk.firstRender.model;
            if (typeof(pathOrKeyList) === "string") {
                keyList = puk.pathToKeyList(pathOrKeyList);
            } else {
                keyList = pathOrKeyList;
            }
            console.assert(keyList.length > 0, "Cannot refine path. (The path is empty.)");
        } else {
            // ==> Recursive call.
            keyList = pathOrKeyList;
        }
        //console.log(["keyList = ", keyList, "obj = ", obj]);          //  -- Debug aid.
        if (keyList.length === 0) {
            return obj;
        }
        // ==> There's at least one more refinement to perform.
        console.assert(obj, "Could not refine path. (Nothing to refine further.)");
        // TODO: if(_.isUndefined(obj)) { event.preventDefault(); }
        key = keyList.shift();
        if (obj.isObservable && obj.get) {
            obj = obj.get();
        }
        obj = obj[key]; // Refinement. The refined obj _could_ be an observable.
        return puk.refineModel(keyList, obj, true);
    };
    uk.refineModel = function (path, obj) {
        return puk.refineModel(path, obj);
    };
    puk.refineModelToPenultimate = function (pathOrKeyList, obj) {
        var keyList, lastKey, initialKeyList, penultimate;
        if (_.isString(pathOrKeyList)) {
            keyList = puk.pathToKeyList(pathOrKeyList);
        } else {
            keyList = pathOrKeyList;
        }
        lastKey = _.last(keyList);
        initialKeyList = _.initial(keyList);
        console.assert(lastKey, "uk.refineToPenultimate: Assert lastKey and initalKeyList.");
        if (initialKeyList.length) {
            penultimate = puk.refineModel(initialKeyList, obj);
        } else {
            penultimate = obj // Req'd for first-level-deep in-observable setting.
        }
        return {
            "penultimate": penultimate,
            "lastKey": lastKey,
        };
    };
    puk.comboInputEventStr = [
        "input", "propertychange", "keyup", "keydown",
        "paste", "cut", "DOMAutoComplete", "dragdrop",
        "drop", "selectionchange",
    ].join(" ");
    puk.comboChangeEventStr = [
        "change", "propertychange", "focusin", "focusout"
    ].join(" ");
    puk.comboEventStr = _.uniq(
        ["click", "submit"]
        .concat(puk.comboInputEventStr.split(" "))
        .concat(puk.comboChangeEventStr.split(" "))
    ).join(" ") && "input change click submit keyup";
    puk.onStrToComboStr = function (onStr) {
        if (onStr === "input.uk") {
            return puk.comboInputEventStr;
        }
        if (onStr === "change.uk") {
            return  puk.comboChangeEventStr;
        }
        return onStr;
    };
    /*puk.listen(puk.comboEventStr, "[data-on]", function (event) {
        var data, eventArgs, retVal;
        
        data = $(event.currentTarget).data();
        data.on = puk.onStrToComboStr(data.on);
        if (! uk.strContains(data.on, event.type)) { return; }                  // Returning false (or null) can have undesired effects.
        eventArgs = _.toArray(arguments);                                       // Note: eventArgs includes the event object.
        
        if (data.on && data.call) {
            retVal = puk.handle_onCall(data, event, eventArgs);
        } else if (data.on && data.bind && data.to) {
            retVal = puk.handle_onBindTo(data, event, eventArgs);
        }
        
        return retVal;
    });*/
    puk.listen(puk.comboEventStr, "[data-on]", puk.batchify(function (event) {
        var data, eventArgs, selector,
            debouncedHash, debouncedFunc;
        data = $(event.currentTarget).data();
        console.assert(data.on, "Assert that puk.rootListener is called (along-)with a truthy `data.on`.");
        data.on = puk.onStrToComboStr(data.on);
        if (! uk.strContains(data.on, event.type)) {
            return; // Short ckt.                                           // Note: Returning false/null can have undesired effects.
        }
        eventArgs = _.toArray(arguments);                                   // Note: `eventArgs` includes the `event` object.
        
        if (! data.debounce) {
            //  ==> Debouncing is turned OFF.
            //console.log("Debouncing is OFF");
            if (data.call) {
                return puk.handle_onCall(data, event, eventArgs);
            }
            // ==> Not an on-call(-arg) sequence.
            console.assert(data.bind && data.to, "Assert that a NON--on-call(-arg) sequence must be an on-bind-to sequence.");
            return puk.handle_onBindTo(data, event, eventArgs);
        }
        
        // ==> Deboncing is turned ON.
        console.assert(data.debounce);
        //console.log("Debouncing is ON.");
        event.stopPropagation();                                            // Note: __ALWAYS__ stop propagation of debounced events.
        selector = puk.getSelector(event.currentTarget);
        debouncedHash = event.type + "; " + selector;                         // Note: That's the hash (key) for memoization.
        debouncedFunc = puk.getDebouncedListener(debouncedHash, data);
        debouncedFunc(data, event, eventArgs);
        return; // Short ckt.                                               // Note: Returning false/null can have undesired effects.
    }));
    puk.handle_onCall = function (data, event, eventArgs) {
        var func, funcOut, funcArgs = [];                                   // funcArgs: Args passed to func via func.
        
        func = puk.refineModel(data.call);
        console.assert(_.isFunction(func), "Assert that refining `data-call` produces a function.");
        
        //console.log("Handling on-call " + event.type + " on " + puk.getSelector(event.currentTarget));
        //window._data = data;
        _.each(["arg", "litArg"], function (argyKeyStart) {             //  'arg' (phase 1)         'litArg' (phase 2)
            _.all(_.range(0, 10), function (n) {                        //  0, 1, 2, ...            0, 1, 2, ...
                var argyKey = argyKeyStart + (n || "");                 //  arg, arg1, ... arg9     litArg, litArg1, ... litArg9
                if (uk.pyOp(argyKey, "in", data)) {                     //  `arg1 in data`          `litArg1 in data`
                    if (argyKeyStart === "arg") {
                        funcArgs.push(puk.refineModel(data[argyKey]));  // funcArgs = [ ...arg, arg1, ..., litArg, litArg1, ... ]
                    } else if (argyKeyStart === "litArg") {
                        funcArgs.push(data[argyKey]);
                    } else {
                        throw new Error("Underkick: Unexpected state, neither 'arg' nor 'litArg'.");
                    }
                    return true;    // Found argyKey, proceed to next _.all()-based iteration.
                }
                return false;       // Didn't find argyKey, break 0-to-10 loop, wrt _.all().
            });            
        });
        //console.log("funcArgs = "); console.log(funcArgs);
        funcOut = func.apply(event.currentTarget, funcArgs.concat(eventArgs));
        
        if (funcOut === true) { return true; }
        // ==> `func` didn't (explicitly) return true.
        event.preventDefault();
        return funcOut;
    };
    puk.handle_onBindTo = function (data, event, eventArgs) {
        var $currentTgt, toOb, propName, jqFuncName, atPath;
            
        $currentTgt = $(event.currentTarget);
        
        toOb = puk.refineModel(data.to);
        console.assert(toOb.isObservable && toOb.set, "Assert that refining `data-to` produces a settable observable.");
        
        atPath = data.at;
        
        //console.log("Handling on-bind-to " + event.type + " on " + puk.getSelector(event.currentTarget));
        //console.log("toOb = " + uk.toJson(toOb));
        
        //propName = data.bind;                         // Deprecated. Originally data-bind was meant to only point to property names.
        //toOb.set($currentTgt.prop(propName), atPath);
        
        if (_.isFunction($currentTgt[data.bind])) {
            // ==> data-bind points to a jQuery function (property). Eg. data-bind="val"
            jqFuncName = data.bind;
            if (_.isUndefined(data.param)) {
                // Eg. <select multiple data-on="change" data-bind="val" data-to="/path/to/obArr">
                console.log("Underkick: WARNING! data-param is experimental and may be discontinued."); // XXX:Ponder data-jq-param?
                toOb.set($currentTgt[jqFuncName](), atPath);
            } else {
                // Eg. <input type="checkbox" data-on="change" data-bind="is" data-param="checked" data-to="/path/to/boolOb">
                toOb.set($currentTgt[jqFuncName](data.param), atPath);
            }
        } else {
            // Eg. <input type="text" data-on="input" data-bind="value" data-to="/path/to/strOb"> 
            //  Originally, data-bind could only point to a propertyName.
            //  Now, (as handled in above if-clause,) it may also point to the name of a jq-function-name.
            propName = data.bind;
            toOb.set($currentTgt.prop(propName), atPath);
        }
        
        // Note: The following are __effectively__ equivalent:
        //  1. <input type="checkbox" data-on="change" data-bind="checked" data-to="/foo">                  foo <-- el.checked    
        //  2. <input type="checkbox" data-on="change" data-bind="is" data-param=":checked" data-to="/foo"> foo <-- $(el).is(":checked")
        
        // XXX:Note: data-arg vs data-param
        //  + In data--on-call-arg, data-arg is expected to be the path to an observable or observableArray.
        //  + Bt in data--on-bind-param-to, data-param is expected to a __literal__, to be passed to the bind-pointed jqFunction.
    };
    puk.getDebouncedListener = _.memoize(function (_debouncedMemoHash, data) {
        var debounceWait;
        console.assert(data.on && data.debounce, "Assert that to get debounced listener, there's an on-(foo-bar-)debounced sequence.");
        if (_.isNumber(data.debounce) && data.debounce > 0) {
            debounceWait = data.debounce;
        } else {
            debounceWait = ukConfig.debounceWait || 200;
        }
        if (data.call) {
            return puk.debounce(puk.handle_onCall, debounceWait);
        }
        // ==> Not an on-call(-arg) sequence.
        console.assert(data.bind && data.to);
        return puk.debounce(puk.handle_onBindTo, debounceWait);
    });
    
    
    // OTHER MISC ::::::::::::::::::::::::::::::::::::::
    uk.ifElse = function (condition, consequent, alternate) {
        consequent = consequent || "";
        alternate = alternate || "";
        return (condition) ? (consequent) : (alternate);
    };
    uk.ifThen = uk.ifElse;
    uk.if = uk.ifThen; // Deprecated in favour of uk.ifThen
    
    puk.getCompiledComponent = _.memoize(function (id) {
        var $source, sourceStr, varName, settings;
        $source = $("#" + id);
        if (! $source.length) {
            throw new Error("Underkick: No such component: #" + id);
        }
        sourceStr = $source.html();
        varName = $source.data("as") || "submodel";
        settings = $.extend(
            {},
            puk.firstRender.settings,                   // Used to be puk.computedTemplateSettings,
            {"variable": varName}//,
        );
        return _.template(sourceStr, settings);
    });
    uk.component = function (id, submodel) {
        var tplFunc = puk.getCompiledComponent(id);
        return tplFunc(submodel);
    };
    uk.renderTemplate = function (tplStr, submodel, varName) {
        var settings = $.extend(
            {},
            puk.firstRender.settings,
            {variable: varName}//,
        );
        return _.template(tplStr, settings)(submodel);
    };
    uk.strContains = function (bigString, smallString) {
        return bigString.indexOf(smallString) !== -1;
    };
    uk.pyOp = function (x, op, y/*, z, ... */) {
        var args = _.toArray(arguments);
        return uk.pyOp[op.toLowerCase()].apply(null, args);
    };
    uk.pyOp.in = function (x, _in, container) {
        if (_.isArray(container)) {                         // Check if element in array.
            return _.contains(container, x);                    // Eg:  uk.pyOp("John", "in", firstNameList);
        }
        if (_.isString(x) && _.isString(container)) {       // Check if substring in string.
            return uk.strContains(container, x);                // Eg:  uk.pyOp("ing", "in", "King");
        }
        if (_.isString(x) && $.isPlainObject(container)) {  // Check if key in dict.
            return _.has(container, x);                         // Eg.  uk.pyOp("firstName", "in", personObject);
        }
        // ==> Unexpected container (or container-x combination)
        throw new TypeError("Bad operators for pythonic-in checking."); // TODO: Improve error message.
        // TODO: Consider using _.has even for non-plain-object containers, instead of throwing error.
    };
    uk.pyOp["not in"] = function (x, _not_in, container) {
        return (! uk.pyOp(x, "in", container));
    };
    uk.pyOp.pop = function (listy, _pop, index) {
        var removedItemList;
        console.assert(listy.length >= 1, "uk.pyOp/pop: Assert that there's at least one element in the list that we want to pop from.");
        if (_.isUndefined(index)) {
            index = listy.length - 1;
        }
        if (index < 0) {
            index = listy.length - index;
        }
        console.assert(0<= index && index < listy.length, "uk.pyOp/pop: Assert that the index to pop from is valid.");
        removedItemList = listy.splice(index, 1);
        console.assert(removedItemList.length === 1, "uk.pyOp/pop: Assert that exactly one item was popped from list.");
        return removedItemList[0];
    };
    //uk.py = uk.pyOp;    // TODO: Consider alias. Shorter, sometimes more meaningful.
    uk.isMultiMatch = function (obj, propMapList, funcAnyOrAll) {   // Like _.isMatch(), but accepts multiple propMaps to match against.
        funcAnyOrAll = funcAnyOrAll || _.all;
        console.assert(uk.pyOp(funcAnyOrAll, "in", [_.any, _.all]), "uk.isMultiMatch: Assert funcAnyOrAll is _.any or _.all.");
        return funcAnyOrAll(propMapList, function (propMap) {
            return _.isMatch(obj, propMap);
        });
    };
    uk.multiMatcher = function (propMapList, funcAnyOrAll) {        // A wrapper around uk.isMultiMatch(), ala _.matcher().
        return function (obj) {
            return uk.isMultiMatch(obj, propMapList, funcAnyOrAll);
        };
    };
    
    uk.break = function () { return uk.break; };                    // As func returns itself, uk.breakLoop === uk.breakLoop();
    // Note: Reserved word as property works only on IE9+?. Surely works in IE11 and Edge.
    uk.loop = function (listy, funcy, thisy) {
        _.all(listy, function (/*args*/) {
            var args, funcyOut;
            args = _.toArray(arguments);
            funcyOut = funcy.apply(thisy, args);
            if (funcyOut === uk.break) {
                return false;   // Break out of all-based iteration.
            }
            return true;        // Move to next (all-based) iteration.
        });
    };
    
    uk.parseQs = function (qs, shouldTrim) {
        // TODO: Add query string (format) validation.
        var pairRe, info;
        qs = qs || location.search.slice(1);
        shouldTrim = shouldTrim || false;
        pairRe =  /[^=&]+\=[^=&]+/g;                        // Something of the form "foo=bar"
        info = {};
        _.each(qs.match(pairRe), function (pair) {
            var kv = _.map(pair.split("="), decodeURIComponent);
            if (shouldTrim) {
                kv[0] = kv[0].trim();
                kv[1] = kv[1].trim();
            }
            info[kv[0]] = kv[1];
        });
        return info;
    };
    uk.fromQs = uk.parseQs; // Alias;
    uk.toQs = function (info) {
        return _.map(info, function (v, k) {
            return _.map([k, v], encodeURIComponent).join("=");
        }).join("&");
    };
    
    // RUNNING PLUGINS: (Do this just before returning uk.)
    _.each(puk.pluginList, function (pluginFunc) {
        pluginFunc(uk, $, _);
    });

    // Debug line:
    uk.puk = puk;
    // Export:
    return uk;
};

module.exports = underkick;
