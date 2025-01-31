
document.getElementById('graphForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const verticesInput = document.getElementById('vertices').value.trim();
    const edgesInput = document.getElementById('edges').value.trim();
    const startNode = document.getElementById('startNode').value.trim();
    const endNode = document.getElementById('endNode').value.trim();

    if (!verticesInput || !edgesInput || !startNode || !endNode) {
        alert("Please enter the vertices, edges, start node, and end node.");
        return;
    }

    const vertices = verticesInput.split(',');
    const edges = edgesInput.split(',').map(edge => {
        const [source, target, weight] = edge.split('-');
        return { source, target, weight: parseFloat(weight) };
    });

    if (!vertices.includes(startNode) || !vertices.includes(endNode)) {
        alert("Invalid start or end node. Please make sure the nodes exist in the graph.");
        return;
    }

    const graph = buildGraph(vertices, edges);
    const { distances, previousNodes } = dijkstra(graph, startNode);
    const { path, totalDistance } = getShortestPath(graph, previousNodes, startNode, endNode);

    // Display results
    document.getElementById('pathOutput').textContent = `Path: ${path.join(' -> ')}`;
    document.getElementById('distanceOutput').textContent = `Total Distance: ${totalDistance}`;
});

function buildGraph(vertices, edges) {
    const graph = {};
    vertices.forEach(vertex => graph[vertex] = {});
    edges.forEach(({ source, target, weight }) => {
        graph[source][target] = weight;
        if (document.getElementById('graphType') && document.getElementById('graphType').value === 'undirected') {
            graph[target][source] = weight; // For undirected graphs
        }
    });
    return graph;
}

function dijkstra(graph, start) {
    const distances = {};
    const previousNodes = {};
    const priorityQueue = [];

    for (const node in graph) {
        distances[node] = Infinity;
        previousNodes[node] = null;
    }
    distances[start] = 0;
    priorityQueue.push({ node: start, distance: 0 });

    while (priorityQueue.length) {
        priorityQueue.sort((a, b) => a.distance - b.distance);
        const { node: currentNode } = priorityQueue.shift();

        for (const neighbor in graph[currentNode]) {
            const distance = distances[currentNode] + graph[currentNode][neighbor];
            if (distance < distances[neighbor]) {
                distances[neighbor] = distance;
                previousNodes[neighbor] = currentNode;
                priorityQueue.push({ node: neighbor, distance });
            }
        }
    }

    return { distances, previousNodes };
}

function getShortestPath(graph, previousNodes, start, end) {
    const path = [];
    let currentNode = end;
    let totalDistance = 0;

    while (currentNode !== null) {
        path.unshift(currentNode);
        const prevNode = previousNodes[currentNode];
        if (prevNode !== null) {
            totalDistance += graph[prevNode][currentNode];
        }
        currentNode = prevNode;
    }

    if (path[0] !== start) {
        return { path: [], totalDistance: Infinity };
    }

    return { path, totalDistance };
}
