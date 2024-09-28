import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const Loran = () => {
  const [stations, setStations] = useState([
    { id: 'source_1', x: 0, y: 0 },
    { id: 'source_2', x: 100000, y: 0 },
    { id: 'source_3', x: 0, y: 100000 },
  ]);
  const [objectPosition, setObjectPosition] = useState({ x: 50000, y: 50000 });
  const c = 3e8 / 10e8; 

  const tdoaError = (params, x1, y1, x2, y2, x3, y3, deltaT12, deltaT13, c) => {
    const [x, y] = params;
    const d1 = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    const d2 = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
    const d3 = Math.sqrt((x - x3) ** 2 + (y - y3) ** 2);

    const deltaT12Calc = (d1 - d2) / c;
    const deltaT13Calc = (d1 - d3) / c;

    const error1 = deltaT12Calc - deltaT12;
    const error2 = deltaT13Calc - deltaT13;

    return [error1, error2];
  };

  const lossFunction = (params, tdoaErrorFunc, args) => {
    const errors = tdoaErrorFunc(params, ...args);
    return errors.reduce((acc, err) => acc + err ** 2, 0);
  };

  const customLeastSquares = (tdoaErrorFunc, initialGuess, args, learningRate = 0.01, maxIterations = 10000, tolerance = 1e-12) => {
    let [x, y] = initialGuess;
    let prevLoss = Infinity;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const loss = lossFunction([x, y], tdoaErrorFunc, args);

      if (Math.abs(prevLoss - loss) < tolerance) break;

      prevLoss = loss;

      const delta = 1e-6;
      const gradX = (lossFunction([x + delta, y], tdoaErrorFunc, args) - loss) / delta;
      const gradY = (lossFunction([x, y + delta], tdoaErrorFunc, args) - loss) / delta;

      x -= learningRate * gradX;
      y -= learningRate * gradY;
    }

    return [x, y];
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4002');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.sourceId && data.receivedAt) {
        const deltaT12 = 0.0001806640625 * 10e8; 
        const deltaT13 = -0.00014453125 * 10e8; 
        const movementFactor = 0.01;

        const [x, y] = customLeastSquares(
          tdoaError,
          [objectPosition.x, objectPosition.y],
          [stations[0].x, stations[0].y, stations[1].x, stations[1].y, stations[2].x, stations[2].y, deltaT12, deltaT13, c]
        );
        console.log("Координати об'єкта:", x, y); 

        setObjectPosition({ x, y });

        // setObjectPosition((prevPosition) => {
        //   const [newX, newY] = customLeastSquares(
        //     tdoaError,
        //     [prevPosition.x, prevPosition.y],
        //     [stations[0].x, stations[0].y, stations[1].x, stations[1].y, stations[2].x, stations[2].y, deltaT12, deltaT13, c]
        //   );
  
        //   console.log("Координати об'єкта:", newX, newY);
  
        //   return {
        //     x: prevPosition.x + (newX - prevPosition.x) * movementFactor,
        //     y: prevPosition.y + (newY - prevPosition.y) * movementFactor,
        //   };
        // });
      
      }
    };
    return () => ws.close(); 
  }, [objectPosition]);
  
  return (
    <div>

    <Plot
      data={[
        {
          x: stations.map(station => station.x ) ,
          y: stations.map(station => station.y ),
          mode: 'markers',
          marker: { color: 'blue', size: 12 },
          name: 'Базові станції',
        },
        {
          x: [objectPosition.x ],
          y: [objectPosition.y ],
          mode: 'markers',
          marker: { color: 'red', size: 12 },
          name: 'Об\'єкт',
        },
      ]}
      layout={{
          title:  'Положення об\'єкта і базових станцій',
          xaxis: { title: 'X координата' },
          yaxis: { title: 'Y координата' },
        showlegend: true,
      }}
    />
    </div>
  );
};

export default Loran;
