var PRIME = "\u2032";

function addParents(tree) {
    if (tree.children.length == 0) {
        tree.parent = null;
    }
    else {
        for (var i = 0; i < tree.children.length; ++i) {
            tree.children[i].parent = tree;
            addParents(tree.children[i]);
        }
    }
}

function shuffle(array) {
    var m = array.length, t, i;
    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);
        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
}

// Creates a random tree that accords with the X-bar template
// with the specified number of phrases.
function randomTree(nPhrases, letters) {
    var treelets = new Array(nPhrases);
    for (var i = 0; i < treelets.length; ++i) {
        var l = letters[i % letters.length];
        treelets[i] = {
            label: l + 'P',
            children: [{
                label: l + PRIME,
                children: [{
                    label: l,
                    children: [ ]
                }]
            }]
        };
    }

    shuffle(treelets);

    while (treelets.length > 1) {
        if (treelets[0].children.length == 2 && treelets[0].children[0].children.length == 2) {
            // If the first treelet has both a head and a spec, put it at the end.
            var tmp = treelets[treelets.length - 1];
            treelets[treelets.length-1] = treelets[0];
            treelets[0] = tmp;
        }
        else if (treelets[0].children.length == 1 && treelets[0].children[0].children.length == 1) {
            // We can add either a head or a specifier, so choose at random.
            if (Math.random() < 0.5) {
                treelets[0].children.unshift(treelets[treelets.length-1]);
            }
            else {
                treelets[0].children[0].children.push(treelets[treelets.length-1])
            }
            treelets.splice(treelets.length-1, 1); // Remove last element
        }
        else {
            // Otherwise it has only a spec or only a comp, in which case we put it
            // at the end 50% of the time so that we get some phrases with just specs
            // and just comps.
            if (Math.random() < 0.5) {
                var tmp = treelets[treelets.length - 1];
                treelets[treelets.length-1] = treelets[0];
                treelets[0] = tmp;
            }
            else if (treelets[0].children.length == 2 && treelets[0].children[0].children.length == 1) {
                // It has a spec but no comp.
                treelets[0].children[0].children.push(treelets[treelets.length-1])
                treelets.splice(treelets.length-1, 1); // Remove last element
            }
            else {
                // It has a comp but no spec.
                treelets[0].children.unshift(treelets[treelets.length-1]);
                treelets.splice(treelets.length-1, 1); // Remove last element
            }
        }
    }

    return treelets[0];
}

function randomPathPair(tree) {
    var paths = [ ];

    (function rec (tree, path) {
        paths.push([tree, path]);
        for (var i = 0; i < tree.children.length; ++i) {
            rec(tree.children[i], path + i)
        }
    })(tree, '');

    var i1 = parseInt(Math.round(Math.random() * (paths.length-1)));
    var i2 = parseInt(Math.round(Math.random() * (paths.length-1)));
    if (i1 == i2) {
        if (i1 > 0)
            --i1;
        else
            ++i1;
    }

    return [paths[i1], paths[i2]];
}

function checkCCommand(tree, path1, path2) {
    if (path1.indexOf(path2) == 0 || path2.indexOf(path1) == 0)
        return false;

    var commander = tree;
    var lastNonunary = 0;
    for (var i = 0; i < path1.length; ++i) {
        var c = path1.charCodeAt(i) - '0'.charCodeAt(0);
        commander = commander.children[c];
        if (commander.children.length > 1)
            lastNonunary = i;
    }

    return path2.indexOf(path1.substr(0, lastNonunary)) == 0;
}

function treeToSimpleWidthTree(tree, measureWidth) {
    if (tree.children.length == 0) {
        return {
            children: [ ],
            width: measureWidth(tree),
            label: tree.label,
            labelWidth: measureWidth(tree)
        };
    }
    else {
        var w = 0;
        var cs = [ ];
        for (var i = 0; i < tree.children.length; ++i) {
            cs.push(treeToSimpleWidthTree(tree.children[i], measureWidth));
        }
        for (var i = 0; i < cs.length; ++i)
            w += cs[i].width;
        var lw = measureWidth(tree);
        return {
            children: cs,
            width: w,
            label: tree.label,
            labelWidth: lw
        };
    }
}

function widthTreeToPositionTree(tree, levelHeight, xOffset, yOffset) {
    if (tree.children.length == 0) {
        return {
            label: tree.label,
            labelWidth: tree.labelWidth,
            width: tree.width,
            x: xOffset + tree.labelWidth/2,
            y: yOffset,
            children: [ ]
        }
    }
    else {
        var cs = [ ];
        var childY = yOffset + levelHeight;
        var xo = xOffset;
        for (var i = 0; i < tree.children.length; ++i) {
            cs.push(widthTreeToPositionTree(tree.children[i], levelHeight, xo, childY));
            xo += tree.children[i].width;
        }

        var w = tree.width;

        var x = xOffset + (tree.width / 2);

        return {
            label: tree.label,
            labelWidth: tree.labelWidth,
            width: tree.width,
            x: x,
            y: yOffset,
            children: cs
        }
    }
}

function layoutTree(tree, measureWidth, levelHeight, xOffset, yOffset) {
    tree = treeToSimpleWidthTree(tree, measureWidth);
    tree = widthTreeToPositionTree(tree, levelHeight, xOffset, yOffset);
    return tree;
}

function renderTree(ctx, tree, fontSize, levelHeight, hpad, highlights) {
    ctx.font = fontSize + "px Helvetica";

    var yMargin = fontSize * 2;

    tree = layoutTree(
        tree,
        function (t) { return ctx.measureText(hpad + t.label + hpad).width },
        levelHeight,
        fontSize * 2, // Give a bit of a left margin
        yMargin
    );

    ctx.font = fontSize + "px Helvetica";

    var treeHeight = 0;
    var treeWidth = 0;
    (function rec(tree, path, height) {
        ctx.fillStyle = "#000000";
        ctx.fillText(hpad + tree.label + hpad, tree.x - tree.labelWidth/2, tree.y + fontSize);

        if (tree.y > treeHeight)
            treeHeight = tree.y;
        if (tree.x + tree.labelWidth/2 > treeWidth)
            treeWidth = tree.x + tree.labelWidth/2;

        for (var i = 0; i < tree.children.length; ++i) {
            ctx.beginPath();
            ctx.moveTo(tree.x, tree.y + fontSize * 1.25);
            ctx.lineTo(tree.children[i].x,
                       tree.children[i].y - fontSize*0.05);
            ctx.strokeStyle = "#000000";
            ctx.stroke();
            ctx.closePath();
            rec(tree.children[i], path + i);
        }

        if (highlights[path]) {
            ctx.beginPath();
            ctx.arc(tree.x, tree.y + fontSize*0.5, fontSize*1.5, 0, 2*Math.PI);
            if (highlights[path].commander) {
                ctx.strokeStyle = "#00FF00";
            }
            else if (highlights[path].commanded) {
                ctx.strokeStyle = "#FF0000";
            }
            ctx.stroke();
            ctx.closePath();
        }
    })(tree, [ ]);

    treeHeight += levelHeight;
    return [treeWidth, treeHeight];
}

function poseQuestion(canvas, ctx, qdiv, container, answeredCallback) {
    // Clear the canvas.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    var tree = randomTree(10, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    var pathPair = randomPathPair(tree);
    var highlights = { };
    highlights[pathPair[0][1]] = { commander: true };
    highlights[pathPair[1][1]] = { commanded: true };
    var wh = renderTree(ctx, tree, 12, 30, "   ", highlights);

    while (qdiv.hasChildNodes()) {
        qdiv.removeChild(qdiv.lastChild);
    }

    qdiv.style.position = 'absolute';
    qdiv.style.top = wh[1] + 'px';
    qdiv.style.width = wh[0] + 'px';
    qdiv.style.textAlign = 'center';

    var q = document.createElement("div");
    q.style.margin = "0";
    q.style.padding = "0";
    q.style.position = "relative";
    q.style.top = "2em";
    q.style.textAlign = 'center';
    q.style.fontWeight = 'bold';

    q.appendChild(
        document.createTextNode("Does " + pathPair[0][0].label + " c-command " + pathPair[1][0].label + "?")
    );

    var response = document.createElement("ul");
    response.style.textAlign = "left";
    response.style.display = "table";
    response.style.marginLeft = "auto";
    response.style.marginRight = "auto";
    response.style.fontWeight = 'normal';
    response.style.fontSize = 'x-large';
    response.style.paddingLeft = "0px";
    var li1 = document.createElement("li");
    li1.className = "clickable";
    li1.style.display = "inline";
    li1.appendChild(document.createTextNode("Yes"));
    var li2 = document.createElement("li");
    li2.style.display = "inline";
    li2.style.marginLeft = "4em";
    li2.className = "clickable";
    li2.appendChild(document.createTextNode("No"));
    response.appendChild(li1);
    response.appendChild(li2);
    q.appendChild(response);

    addEventListenerShim(li1, "click", handleYes);
    addEventListenerShim(li2, "click", handleNo);

    qdiv.appendChild(q);

    var pw = parseInt(Math.round(wh[0] + 8)) + 'px';
    container.style.width = pw;
    container.style.maxWidth = pw;

    function rem() {
        removeEventListenerShim(li1, "click", handleYes);
        removeEventListenerShim(li2, "click", handleNo);
        li1.className = "";
        li2.className = "";
    }
    function handleYes(e) {
        e.preventDefault();
        rem();
        answeredCallback(checkCCommand(tree, pathPair[0][1], pathPair[1][1]));
    }
    function handleNo(e) {
        e.preventDefault();
        rem();
        answeredCallback(! checkCCommand(tree, pathPair[0][1], pathPair[1][1]));
    }
}

function addEventListenerShim(obj, event, handler) {
    if (obj.addEventListener) {
        obj.addEventListener(event, handler);
    }
    else {
        obj.attachEvent(event, handler);
    }
}
function removeEventListenerShim(obj, event, handler) {
    if (obj.removeEventListener) {
        obj.removeEventListener(event, handler);
    }
    else {
        obj.detachEvent(event, handler);
    }
}

addEventListenerShim(document, "DOMContentLoaded", function(event) {
    var SCALE = 2;

    var w = parseInt(Math.round(0.9 * Math.max(document.documentElement.clientWidth, window.innerWidth || 0)));
    var h = parseInt(Math.round(0.9 * Math.max(document.documentElement.clientHeight, window.innerHeight || 0)));
    if (! w)
        w = 500;
    if (! h)
        h = 500;

    var canvas = document.getElementById("canvas");
    canvas.width = w*SCALE;
    canvas.height = h*SCALE;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    var ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    var container = document.getElementById("container");
    var qdiv = document.getElementById("question");
    poseQuestion(canvas, ctx, qdiv, container, handleAnswer);
    function handleAnswer(correct) {
        var answerTime = new Date().getTime();

        var d = document.createElement("div");
        d.style.fontWeight = 'bold';
        d.style.marginLeft = "auto";
        d.style.marginRight = "auto";
        d.style.display = "table";
        d.style.marginTop = "1em";
        if (correct) {
            d.style.color = 'green';
            d.appendChild(document.createTextNode("CORRECT"));
        }
        else {
            d.style.color = 'red';
            d.appendChild(document.createTextNode("INCORRECT"));
        }

        var next = document.createElement("div");
        next.appendChild(document.createTextNode("click/touch anywhere for next question"));
        next.style.marginTop = "1em";
        next.style.fontStyle = "italic";
        next.style.fontWeight = 'normal';

        while (qdiv.firstChild.hasChildNodes())
            qdiv.firstChild.removeChild(qdiv.firstChild.lastChild);
        
        qdiv.firstChild.appendChild(d);
        qdiv.firstChild.appendChild(next);

        addEventListenerShim(window, "click", click);
        addEventListenerShim(window, "touchstart", click);
        addEventListenerShim(window, "keydown", key);
        function rem() {
            removeEventListenerShim(window, "click", click);
            removeEventListenerShim(window, "touchstart", click);
            removeEventListenerShim(window, "keydown", key);
        }
        function key(e) {
            rem();
            poseQuestion(canvas, ctx, qdiv, handleAnswer);
        }
        function click (e) {
            if (new Date().getTime() - answerTime < 100)
                return;

            rem();
            
            var start = new Date().getTime();
            var ANIM_TIME = 1000;
            var id = setInterval(f, 50);
            var not_posed = true;
            function f () {
                var elapsed = new Date().getTime() - start;
                if (elapsed >= ANIM_TIME) {
                    clearInterval(id);
                    container.style.opacity = 1.0;
                }
                else if (elapsed >= ANIM_TIME/2) {
                    if (not_posed) {
                        not_posed = false;
                        poseQuestion(canvas, ctx, qdiv, container, handleAnswer);
                    }
                    var op = (elapsed-ANIM_TIME/2)/(ANIM_TIME/2);
                    container.style.opacity = op;
                }
                else {
                    var op = (1.0 - elapsed/(ANIM_TIME/2));
                    container.style.opacity = op;
                }
            }
        };
    }
});
