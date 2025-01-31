let initialScale = 1;
let vertices, edges, graphType;

document.getElementById('graphForm').addEventListener('submit', function(event) {
    event.preventDefault();

    vertices = document.getElementById('vertices').value.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    edgesInput = document.getElementById('edges').value.split(',').map(e => e.trim().replace(/^"|"$/g, ''));

    graphType = document.getElementById('graphType').value;

    edges = edgesInput.map((edge, index) => {
        const [source, target, weight] = edge.split('-').map(e => e.trim().replace(/^"|"$/g, ''));
        return { source, target, weight: parseFloat(weight), id: index };
    });

    generateGraph(vertices, edges, graphType, initialScale);
});

// Optimized Edge Coloring Function
function colorEdges(edges) {
    const edgeColors = {};
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

    // Calculate vertex degrees
    const vertexDegree = {};
    edges.forEach(edge => {
        vertexDegree[edge.source] = (vertexDegree[edge.source] || 0) + 1;
        vertexDegree[edge.target] = (vertexDegree[edge.target] || 0) + 1;
    });

    const maxDegree = Math.max(...Object.values(vertexDegree));

    // Assign colors to edges
    edges.forEach((edge, index) => {
        const usedColors = new Set();

        // Find colors used by adjacent edges
        edges.forEach((adjEdge) => {
            if (
                (adjEdge.source === edge.source || adjEdge.target === edge.source ||
                adjEdge.source === edge.target || adjEdge.target === edge.target) &&
                edgeColors[adjEdge.id] !== undefined
            ) {
                usedColors.add(edgeColors[adjEdge.id]);
            }
        });

        // Assign the first available color
        for (let color of colorPalette) {
            if (!usedColors.has(color)) {
                edgeColors[index] = color;
                break;
            }
        }
    });

    const uniqueEdgeColorsCount = new Set(Object.values(edgeColors)).size;

    // Display edge coloring information
    // if (uniqueEdgeColorsCount <= maxDegree + 1) {
    //     document.getElementById('colorInfo').textContent = `Edge coloring within bounds. Number of colors used: ${uniqueEdgeColorsCount}`;
    // } else {
    //     document.getElementById('colorInfo').textContent = `Edge coloring exceeds bounds. Number of colors used: ${uniqueEdgeColorsCount}`;
    // }
    document.getElementById('colorInfo').textContent = `Number of colors used: ${uniqueEdgeColorsCount}`;


    return edgeColors;
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
        .force("link", d3.forceLink(links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-300))
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

    const edgeColors = colorEdges(edges);  // Get the color for each edge

    const link = svg.append("g")
        .attr("stroke-opacity", 1)
        .selectAll("path")
        .data(links)
        .enter().append("path")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("stroke", d => edgeColors[d.id])  // Use the edge color
        .attr("marker-end", graphType === 'directed' ? 'url(#arrowhead)' : null)
        .attr("d", d => createEdgePath(d));

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("fill", "black")
        .attr("r", 5)
        .call(drag(simulation));

    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("dy", -10)
        .attr("dx", 10)
        .text(d => d.id)
        .style("font-size", "12px");

    simulation
        .nodes(nodes)
        .on("tick", () => {
            link.attr("d", d => createEdgePath(d));
            node.attr("transform", d => `translate(${d.x},${d.y})`);
            label.attr("transform", d => `translate(${d.x},${d.y})`);
        });

    simulation.force("link").links(links);
}

function calculateCurvature(edges, edge, index) {
    // Define a function for edge curvature if necessary
    return 0.5; // Default curvature
}

function createEdgePath(d) {
    const dr = d.curvature || 0; // Default curvature if not defined
    if (graphType === 'directed') {
        return `M${d.source.x},${d.source.y} C${d.source.x + dr},${d.source.y + dr} ${d.target.x - dr},${d.target.y - dr} ${d.target.x},${d.target.y}`;
    } else {
        return `M${d.source.x},${d.source.y} C${d.source.x + dr},${d.source.y + dr} ${d.target.x - dr},${d.target.y - dr} ${d.target.x},${d.target.y}`;
    }
}

document.getElementById('zoomIn').addEventListener('click', () => {
    initialScale *= 1.1;
    generateGraph(vertices, edges, graphType, initialScale);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    initialScale /= 1.1;
    generateGraph(vertices, edges, graphType, initialScale);
});
