let initialScale = 1;
let vertices, edges, graphType;

document.getElementById('graphForm').addEventListener('submit', function(event) {
    event.preventDefault();

    vertices = document.getElementById('vertices').value.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    edgesInput = document.getElementById('edges').value.split(',').map(e => e.trim().replace(/^"|"$/g, ''));

    graphType = document.getElementById('graphType').value;

    edges = edgesInput.map(edge => {
        const [source, target, weight] = edge.split('-').map(e => e.trim().replace(/^"|"$/g, ''));
        return { source, target, weight: parseFloat(weight) };
    });

    generateGraph(vertices, edges, graphType, initialScale);
    colorVertices(vertices, edges);
});

// Coloring function with 20 distinct colors
function colorVertices(vertices, edges) {
    const colorPalette = [
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
        "#393b79", "#ffbb78", "#98df8a", "#c49c94", "#f7b6d2",
        "#c7c7c7", "#dbdb8d", "#9edae5", "#c5b0d5", "#aec7e8",
        "#ff9896", "#f7b6d2", "#c5b0d5", "#c49c94", "#d9d9d9",
        "#ffddc1", "#f2a900", "#e9c46a", "#6a4c93", "#2a9d8f",
        "#264653", "#e76f51", "#f8b400", "#2a2d34", "#6a0572",
        "#ab83c1", "#f5cac3", "#ffe156", "#00b2a9", "#ff6f61",
        "#7b2d67", "#f1c40f", "#e74c3c", "#3498db", "#2ecc71",
        "#9b59b6", "#34495e", "#16a085", "#27ae60", "#2980b9",
        "#8e44ad", "#2c3e50", "#95a5a6", "#d35400", "#e67e22",
        "#e74c3c", "#f39c12", "#c0392b", "#8e44ad", "#2c3e50",
        "#16a085", "#27ae60", "#3498db", "#9b59b6", "#34495e",
        "#f39c12", "#e67e22", "#c0392b", "#8e44ad", "#2c3e50",
        "#7f8c8d", "#bdc3c7", "#2c3e50", "#f39c12", "#e74c3c",
        "#2980b9", "#27ae60", "#8e44ad", "#9b59b6", "#34495e",
        "#16a085", "#f1c40f", "#2ecc71", "#3498db", "#e74c3c"
    ];

    const colors = {}; // Store assigned colors
    const adjacencyList = {}; // Build adjacency list

    vertices.forEach(vertex => {
        adjacencyList[vertex] = [];
    });

    edges.forEach(edge => {
        adjacencyList[edge.source].push(edge.target);
        adjacencyList[edge.target].push(edge.source);
    });

    const sortedVertices = vertices.sort((a, b) => adjacencyList[b].length - adjacencyList[a].length);

    sortedVertices.forEach((vertex, index) => {
        const usedColors = new Set();

        adjacencyList[vertex].forEach(adjVertex => {
            if (colors[adjVertex] !== undefined) {
                usedColors.add(colors[adjVertex]);
            }
        });

        for (let i = 0; i < colorPalette.length; i++) {
            const color = colorPalette[i];
            if (!usedColors.has(color)) {
                colors[vertex] = color;
                break;
            }
        }
    });

    const uniqueColorsCount = new Set(Object.values(colors)).size;
    document.getElementById('colorInfo').textContent = `Number of colors used: ${uniqueColorsCount}`;

    return colors;
}

function drag(simulation) {
    return d3.drag()
        .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        })
        .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        });
}

function generateGraph(vertices, edges, graphType, initialScale) {
    const nodes = vertices.map(id => ({ id }));
    const links = edges.map((edge, index) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        id: index,
        curvature: calculateCurvature(edges, edge, index)
    }));

    const graphDiv = document.getElementById('graph');
    const width = graphDiv.clientWidth;
    const height = graphDiv.clientHeight;

    const svg = d3.select("#graph").html("").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().scaleExtent([0.1, 10]).on("zoom", (event) => {
            svg.attr("transform", event.transform);
        }))
        .append("g");

    svg.attr("transform", `translate(${width / 2}, ${height / 2}) scale(${initialScale})`);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(50))  // Reduced link distance
        .force("charge", d3.forceManyBody().strength(-300))  // Adjusted charge strength for large graphs
        .force("center", d3.forceCenter(0, 0));

    if (graphType === 'directed') {
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 13)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');
    }

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 1)
        .selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("marker-end", graphType === 'directed' ? 'url(#arrowhead)' : null)
        .attr("d", d => createEdgePath(d));

    const colors = colorVertices(vertices, edges);

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("fill", d => colors[d.id])
        .attr("r", 5)
        .call(drag(simulation));

    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("dy", -10)
        .attr("dx", 10)
        .text(d => d.id)
        .style("font-size", "12px")
        .style("fill", "#333");

    const edgeLabels = svg.append("g")
    .selectAll("text")
    .data(links)
    .enter().append("text")
    .attr("dy", -5)
    .attr("dx", 10)
    .attr("fill", "#000")
    .attr("font-size", "10px")
    .text(d => {
        // Check if weight is a valid number, otherwise return an empty string
        return !isNaN(d.weight) && d.weight !== undefined ? d.weight : ""; 
    });
    

    simulation.on("tick", () => {
        link.attr("d", d => createEdgePath(d));
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
        edgeLabels.attr("x", d => (d.source.x + d.target.x) / 2)
                  .attr("y", d => (d.source.y + d.target.y) / 2);
    });
}

function createEdgePath(d) {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * d.curvature;
    if (d.source === d.target) {
        return `M${d.source.x},${d.source.y} A20,20 0 1,1 ${d.source.x + 1},${d.source.y + 1}`;
    }
    return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
}

function calculateCurvature(edges, currentEdge, index) {
    const parallelEdges = edges.filter(edge =>
        (edge.source === currentEdge.source && edge.target === currentEdge.target) ||
        (edge.source === currentEdge.target && edge.target === currentEdge.source)
    );
    if (parallelEdges.length > 1) {
        const step = 0.5;
        return step * index;
    }
    return 0;
}

document.getElementById('zoomIn').addEventListener('click', () => {
    initialScale *= 1.1;
    generateGraph(vertices, edges, graphType, initialScale);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    initialScale /= 1.1;
    generateGraph(vertices, edges, graphType, initialScale);
});
