let initialScale =1 ;
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

    generateGraph(vertices, edges, graphType,initialScale);
    updateGraphInfo(vertices, edges); 
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


function generateGraph(vertices, edges, graphType,initialScale) {
    const nodes = vertices.map(id => ({ id }));
    const links = edges.map((edge, index) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight, // Keep the weight property
        id: index,
        curvature: calculateCurvature(edges, edge, index)
    }));

    // Get the size of the graph div
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
    
    // Adjust this value for initial scale (0.75 means 75%)
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
        .attr("stroke-width",1)
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

function updateGraphInfo(vertices, edges) {
    // Update the number of vertices and edges displayed
    document.getElementById('numVertices').textContent = vertices.length;
    document.getElementById('numEdges').textContent = edges.length;

    // Create a connection map to track connected vertices
    const connectionMap = {};
    vertices.forEach(vertex => {
        connectionMap[vertex] = new Set(); // Use Set to prevent duplicates
    });

    // Populate the connection map based on edges
    edges.forEach(edge => {
        const { source, target } = edge;
        connectionMap[source].add(target); // Add target to source's set

        if (document.getElementById('graphType').value === 'undirected') {
            connectionMap[target].add(source); // Add source to target's set
        }
    });

    // Clear the previous table body content
    const connectionTableBody = document.getElementById('connectionTableBody');
    connectionTableBody.innerHTML = '';

    // Populate the connection table with vertices and their unique connected vertices
    vertices.forEach(vertex => {
        const row = document.createElement('tr');
        
        // Create a cell for the vertex
        const vertexCell = document.createElement('td');
        vertexCell.textContent = vertex;
        row.appendChild(vertexCell);

        // Create a cell for connected vertices and convert the Set to an array
        const connectionsCell = document.createElement('td');
        connectionsCell.textContent = Array.from(connectionMap[vertex]).join(', '); // Convert Set to Array and join with comma
        row.appendChild(connectionsCell);

        // Append the row to the connection table body
        connectionTableBody.appendChild(row);
    });
}

document.getElementById('zoomIn').addEventListener('click', () => {
    initialScale *= 1.1 ;
    generateGraph(vertices, edges, graphType,initialScale);

});

document.getElementById('zoomOut').addEventListener('click', () => {
    initialScale *= 0.9 ;
    generateGraph(vertices, edges, graphType,initialScale);
});
