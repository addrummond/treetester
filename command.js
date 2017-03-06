var PRIME = "\u2032";

var testTree = {
    label: "foo",
    children: [
        {
            label: "bar",
            children: [ ]
        },
        {
            label: "amp",
            children: [
                {
                    label: "a",
                    children: [ ]
                },
                {
                    label: "b",
                    children: [ ]
                }
            ]
        }
    ]
};
var simpleTestTree = {
    label: "foo",
    children: [
        {
            label: "bar",
            children: [ ]
        },
        {
            label: "a",
            children: [ ]
        }
    ]
};

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

function randomXbar(nNodes, letters) {
    var state = {
        frontiers: [ ],
        letterI: 0,
        nNodes: nNodes
    };
    var tree = randomXbar_(
        letters,
        state
    );
    while (state.nNodes > 0 && state.frontiers.length > 0) {
        var fr = state.frontiers[parseInt(Math.round(Math.random()*(state.frontiers.length-1)))];
        if (fr[0] == 'comp') {
            var x = randomXbar_(letters, state);
            if (x !== null) {
                console.log("PUSH!!!");
                fr[1].children.push(x);
            }
        }
        else {
            var x = randomXbar_(letters, state);
            if (x !== null) {
                console.log("PUSH!!!")
                fr[1].children.unshift(x);
            }
        }
    }

    return tree;
}

function randomXbar_(letters, state) {
    if (state.nNodes == 0) {
        return null;      
    }

    var hasSpec = (state.nNodes > 1 && (Math.random() < 0.5));
    var hasComp = (state.nNodes > 1 && (Math.random() < 0.5));
    if (hasSpec && hasComp && state.nNodes == 2) {
        if (Math.random() < 0.5)
            hasSpec = false;
        else
            hasComp = false;
    }
    var head = letters.charAt(state.letterI++);
    var barChildren = [ { label: head, children: [ ] } ];
    var pChildren = [ ];
    if (hasComp) {
        let r = randomXbar_(letters, state);
        if (r != null) {
            barChildren.push(r);
        }
    }
    if (hasSpec && state.nNodes > 0) {
        let r = randomXbar_(letters, state);
        if (r != null) {
            pChildren.push(r);
        }
    }

    --state.nNodes;
    state.nNodes -= hasSpec;
    state.nNodes -= hasComp;

    pChildren.push({
        label: head + PRIME,
        children: barChildren
    });

    var tree = {
        label: head + "P",
        children: pChildren
    };

    if (! hasComp)
        state.frontiers.push(['comp', pChildren[0]]);
    if (! hasSpec)
        state.frontiers.push(['spec', tree]);

    return tree;
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
            shiftPositionTreeX(moving, -totalDiff);
        }
    }
}

function layoutTree(tree, measureWidth, levelHeight, xOffset, yOffset) {
    tree = treeToSimpleWidthTree(tree, measureWidth);
    tree = widthTreeToPositionTree(tree, levelHeight, xOffset, yOffset);
    ///console.log("BEFORE SQUISH", tree);
    horizontalSquishPositionTree(tree);
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
            ctx.moveTo(tree.x, tree.y + fontSize * 1.1);
            ctx.lineTo(tree.children[i].x,
                       tree.children[i].y + fontSize*0.2);
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

    let tree = randomXbar(3, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    console.log("TREE", tree);
    renderTree(ctx, tree, 12, 20, "   ");
});

/*function treeTriangle(ctx, tree) {
    if (tree.children.length == 0) {
        var m = ctx.measureText(tree.label);
        
    }
}

function renderTree(ctx, tree, offsetX, offsetY) {

}*/