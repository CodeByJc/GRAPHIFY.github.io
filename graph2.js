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

function updateGraphInfo(vertices, edges) {
    const numVertices = document.getElementById('numVertices');
    const numEdges = document.getElementById('numEdges');
    const connectionTableBody = document.getElementById('connectionTableBody');
    const connectionTableHeader = document.getElementById('connectionTableHeader');

    // Update the number of vertices and edges
    numVertices.textContent = vertices.length;
    numEdges.textContent = edges.length;

    // Clear previous connection table
    connectionTableBody.innerHTML = '';

    // Create a connection map to calculate degrees
    const inDegreeMap = {};
    const outDegreeMap = {};

    vertices.forEach(vertex => {
        inDegreeMap[vertex] = 0;   // Initialize in-degree
        outDegreeMap[vertex] = 0;  // Initialize out-degree
    });

    edges.forEach(edge => {
        outDegreeMap[edge.source]++; // Increment out-degree for source
        inDegreeMap[edge.target]++;   // Increment in-degree for target
    });

    // Update table header based on graph type
    if (graphType === 'directed') {
        connectionTableHeader.innerHTML = `
            <th>Vertex</th>
            <th>In-Degree</th>
            <th>Out-Degree</th>
            <th>Connected Vertices</th>
        `;
    } else {
        connectionTableHeader.innerHTML = `
            <th>Vertex</th>
            <th>Degree</th>
            <th>Connected Vertices</th>
        `;
    }

    // Populate the connection table
    vertices.forEach(vertex => {
        const row = document.createElement('tr');
        const vertexCell = document.createElement('td');
        vertexCell.textContent = vertex;

        if (graphType === 'directed') {
            const inDegreeCell = document.createElement('td');
            inDegreeCell.textContent = inDegreeMap[vertex];
            const outDegreeCell = document.createElement('td');
            outDegreeCell.textContent = outDegreeMap[vertex];
            row.appendChild(vertexCell);
            row.appendChild(inDegreeCell);
            row.appendChild(outDegreeCell);
        } else {
            const degreeCell = document.createElement('td');
            degreeCell.textContent = inDegreeMap[vertex] + outDegreeMap[vertex]; // Total degree for undirected graph
            row.appendChild(vertexCell);
            row.appendChild(degreeCell);
        }

        // Add connected vertices to the row
        const connectedVerticesSet = new Set(); // Use a Set to collect unique connected vertices
        edges.forEach(edge => {
            if (edge.source === vertex) {
                connectedVerticesSet.add(edge.target);
            } else if (edge.target === vertex) {
                connectedVerticesSet.add(edge.source);
            }
        });

        const connectedCell = document.createElement('td');
        connectedCell.textContent = Array.from(connectedVerticesSet).join(', '); // Convert Set to Array for display
        row.appendChild(connectedCell);

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
