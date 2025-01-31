let initialScale = 1;
let vertices, edges , graphtype ;
let path = [];
let startVertex , endVertex ;
let distances = {};
let distance , detailsDiv;

document.getElementById('graphForm').addEventListener('submit', function(event) {
    event.preventDefault();

    vertices = document.getElementById('vertices').value.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    let edgesInput = document.getElementById('edges').value.split(',').map(e => e.trim().replace(/^"|"$/g, ''));
    graphType = document.getElementById('graphType').value;

    
    edges = edgesInput.map(edge => {
        const [source, target, weight] = edge.split('-').map(e => e.trim().replace(/^"|"$/g, ''));
        return { source, target, weight: parseFloat(weight) };
    });

    startVertex = document.getElementById('startVertex').value;
    endVertex = document.getElementById('endVertex').value;

    if (!vertices.includes(startVertex) || !vertices.includes(endVertex)) {
        alert('Both start and end vertices must be part of the graph.');
        return;
    }
    generateGraph(vertices, edges, graphType, initialScale);
    finddistance(vertices, edges, startVertex, endVertex, graphType);
    update_graph_info(path,distance,detailsDiv);
});

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
        .call(d3.zoom().on("zoom", (event) => {
            svg.attr("transform", event.transform);
        }))
        .append("g");

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    svg.attr("transform", `translate(${width / 2}, ${height / 2}) scale(${initialScale})`);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-400))
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

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
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
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("d", d => createEdgePath(d));

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        edgeLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
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

function finddistance(vertices, edges, startVertex, endVertex, graphType) {
    const graph = {};
    vertices.forEach(v => graph[v] = []);
    edges.forEach(({ source, target, weight }) => {
        graph[source].push({ target, weight });
        if (graphType === 'undirected') {
            graph[target].push({ target: source, weight });
        }
    });

    const previous = {};
    const queue = new PriorityQueue();

    vertices.forEach(v => {
        distances[v] = Infinity;
        previous[v] = null;
        queue.enqueue(v, Infinity);
    });

    distances[startVertex] = 0;
    queue.enqueue(startVertex, 0);

    while (!queue.isEmpty()) {
        const current = queue.dequeue();

        if (current === endVertex) break;

        graph[current].forEach(neighbor => {
            const newDist = distances[current] + neighbor.weight;
            if (newDist < distances[neighbor.target]) {
                distances[neighbor.target] = newDist;
                previous[neighbor.target] = current;
                queue.enqueue(neighbor.target, newDist);
            }
        });
    }

    let step = endVertex;
    while (step) {
        path.unshift(step);
        step = previous[step];
    }

    distance = distances[endVertex] === Infinity ? 'No path found' : distances[endVertex];
    detailsDiv = document.getElementById('shortestPathDetails');

    highlightShortestPath(path,graphType);
}

class PriorityQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(element, priority) {
        this.queue.push({ element, priority });
        this.queue.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.queue.shift().element;
    }

    isEmpty() {
        return this.queue.length === 0;
    }
}
function highlightShortestPath(path, graphType) {
    if (!path || path.length < 2) {
        alert('No path found between the selected vertices.');
        return;
    }

    // Remove all existing highlights
    d3.selectAll("path").attr("stroke", "#999").attr("stroke-width", 1.5);

    // Highlight the path
    for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];

        d3.selectAll("path")
            .filter(d => {
                if (graphType === 'undirected') {
                    // For undirected graphs, highlight both directions
                    return (d.source.id === source && d.target.id === target) || 
                           (d.source.id === target && d.target.id === source);
                } else {
                    // For directed graphs, only highlight source -> target
                    return d.source.id === source && d.target.id === target;
                }
            })
            .attr("stroke", "red")
            .attr("stroke-width", 2.5);
    }
}
function update_graph_info(path,distance,detailsDiv){
    if (path && path.length > 0) {
        detailsDiv.innerHTML = '';
        detailsDiv.innerHTML += `<P>Shortest Path: ${path.join(' → ')}</p>`;
        detailsDiv.innerHTML += `<p>Distance: ${distance}</p>`;
    } else {
        detailsDiv.innerHTML = '<strong>No path found</strong>';
    }
}
document.getElementById('zoomIn').addEventListener('click', () => {
    initialScale *= 1.1 ;
    generateGraph(vertices, edges, graphType,initialScale);
    finddistance(vertices, edges, startVertex, endVertex, graphType);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    initialScale *= 0.9 ;
    generateGraph(vertices, edges, graphType,initialScale);
    finddistance(vertices, edges, startVertex, endVertex, graphType);
});
