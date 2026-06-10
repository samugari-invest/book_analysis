import React, { useEffect, useRef, useState } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { useDataStore } from '../store/dataStore';

export default function CoocNetwork() {
  const { coocNodes, coocEdges } = useDataStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [info, setInfo] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current || !coocNodes.length) return;

    // Determine min/max weight for scaling
    const weights = coocEdges.map(e => e.weight);
    const maxWeight = Math.max(...weights, 1);
    const minWeight = Math.min(...weights, 1);

    // Determine min/max node value for scaling
    const values = coocNodes.map(n => n.value);
    const maxVal = Math.max(...values, 1);

    const nodes = new DataSet(
      coocNodes.map(n => ({
        id: n.id,
        label: n.label,
        value: n.value,
        size: 10 + (n.value / maxVal) * 30,
        font: { size: 12 + (n.value / maxVal) * 8 },
        title: `${n.label}: ${n.value}回出現`,
      }))
    );

    const edges = new DataSet(
      coocEdges.map((e, i) => ({
        id: i,
        from: e.from,
        to: e.to,
        value: e.weight,
        width: 1 + ((e.weight - minWeight) / (maxWeight - minWeight || 1)) * 5,
        title: `共起: ${e.weight}回`,
        color: { opacity: 0.6 },
      }))
    );

    const options = {
      nodes: {
        shape: 'dot',
        color: {
          background: '#4a90d9',
          border: '#2c6fad',
          highlight: { background: '#e74c3c', border: '#c0392b' },
        },
        font: { color: '#333' },
      },
      edges: {
        color: { color: '#aaa', highlight: '#e74c3c' },
        smooth: { type: 'continuous', enabled: true, roundness: 0.5 },
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 150 },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 120,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
      },
    };

    if (networkRef.current) {
      networkRef.current.destroy();
    }

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = coocNodes.find(n => n.id === nodeId);
        if (node) {
          const connectedEdges = coocEdges.filter(e => e.from === nodeId || e.to === nodeId);
          setInfo(`「${node.label}」: 出現${node.value}回 / 共起${connectedEdges.length}語`);
        }
      } else {
        setInfo('');
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [coocNodes, coocEdges]);

  if (!coocNodes.length) {
    return (
      <div style={{ background: '#fff', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
        データがありません。「データ取得・設定」タブでデータを取得してください。
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '16px' }}>共起ネットワーク</h2>
        <span style={{ fontSize: '13px', color: '#888' }}>
          {coocNodes.length} 語 / {coocEdges.length} エッジ
        </span>
      </div>
      {info && (
        <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#e8f0fe', borderRadius: '4px', fontSize: '13px', color: '#333' }}>
          {info}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          background: '#fafafa',
        }}
      />
      <p style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
        ノードをクリックして詳細表示。スクロールでズーム、ドラッグで移動できます。
      </p>
    </div>
  );
}
