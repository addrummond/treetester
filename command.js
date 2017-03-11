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
        if (treelets[0].children.length == 1 && treelets[0].children[0].children.length == 1) {
            // We can add either a head or a specifier, so choose at random.
            if (Math.random() < 0.5) {
                treelets[0].children.unshift(treelets[treelets.length-1]);
            }
            else {
                treelets[0].children[0].children.push(treelets[treelets.length-1])
            }
            treelets.splice(treelets.length-1, 1); // Remove last element
        }
        else if (treelets[0].children.length == 2 && treelets[0].children[0].length == 1) {
            treelets[0].children[0].children.push(treelets[treelets.length-1])
            treelets.splice(treelets.length-1, 1); // Remove last element
        }
        else if (treelets[0].children.length == 1) {
            treelets[0].children.unshift(treelets[treelets.length-1]);
            treelets.splice(treelets.length-1, 1); // Remove last element
        }
        else {
            // If the first treelet has both a head and a spec, put it at the end.
            var tmp = treelets[treelets.length - 1];
            treelets[treelets.length-1] = treelets[0];
            treelets[0] = tmp;
        }
    }

    return treelets[0];
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

        let w = tree.width;

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

function leftXs(positionTree) {
    let r = [ ];
    for (;;) {
        r.push(positionTree.x - positionTree.labelWidth/2);
        if (positionTree.children.length == 0)
            break;
        else
            positionTree = positionTree.children[0];
    }
    return r;
}

function rightXs(positionTree) {
    let r = [ ];
    for (;;) {
        r.push(positionTree.x + positionTree.labelWidth/2);
        if (positionTree.children.length == 0)
            break;
        else
            positionTree = positionTree.children[positionTree.children.length-1];
    }
    return r;
}

function shiftPositionTreeX(positionTree, x) {
    positionTree.x += x;
    for (var i = 0; i < positionTree.children.length; ++i)
        shiftPositionTreeX(positionTree.children[i], x);
}

function horizontalSquishPositionTree(tree) {
    if (tree.children.length > 0) {
        let squished = [ ];
        for (var i = 0; i < tree.children.length; ++i) {
            squished[i] = horizontalSquishPositionTree(tree.children[i]);
        }
        var totalDiff = 0;
        for (var i = 0; i < tree.children.length - 1; ++i) {
            var target = tree.children[i];
            var moving = tree.children[i + 1];
            var tx = rightXs(target);
            var mx = leftXs(moving);
            var minDiff = Number.POSITIVE_INFINITY;
            var minDiffJ = 0;
            for (var j = 0; j < tx.length && j < mx.length; ++j) {
                var diff = mx[j] - tx[j];
                if (diff < minDiff) {
                    minDiff = diff;
                    minDiffJ = j;
                }
            }
            totalDiff += minDiff;
            var r = totalDiff/2;
            var l = -totalDiff/2;
            shiftPositionTreeX(target, r);
            shiftPositionTreeX(moving, l);
        }
    }
}

function layoutTree(tree, measureWidth, levelHeight, xOffset, yOffset) {
    tree = treeToSimpleWidthTree(tree, measureWidth);
    tree = widthTreeToPositionTree(tree, levelHeight, xOffset, yOffset);
    //horizontalSquishPositionTree(tree);
    return tree;
}

function renderTree(ctx, tree, fontSize, levelHeight, hpad) {
    ctx.font = fontSize + "px Helvetica";

    tree = layoutTree(
        tree,
        function (t) { return ctx.measureText(hpad + t.label + hpad).width },
        levelHeight,
        0,
        0
    );

    ctx.font = fontSize + "px Helvetica";

    (function rec(tree) {
        ctx.fillText(hpad + tree.label + hpad, tree.x - tree.labelWidth/2, tree.y + fontSize);
        for (var i = 0; i < tree.children.length; ++i) {
            ctx.moveTo(tree.x, tree.y + fontSize * 1.25);
            ctx.lineTo(tree.children[i].x,
                       tree.children[i].y - fontSize*0.05);
            ctx.stroke();
            rec(tree.children[i]);
        }
    })(tree);
}

document.addEventListener("DOMContentLoaded", function(event) {
    var SCALE = 2;

    let w = document.documentElement.clientWidth || 500;
    let h = document.documentElement.clientHeight || 500;

    var canvas = document.getElementById("canvas");
    canvas.width = w*SCALE;
    canvas.height = h*SCALE;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    var ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    let tree = randomTree(10, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    renderTree(ctx, tree, 12, 30, "   ");
});
