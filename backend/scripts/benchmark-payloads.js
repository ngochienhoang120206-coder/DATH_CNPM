const path = require('path');
const crypto = require('crypto');

function resolveYjs() {
  try {
    return require('yjs');
  } catch (_e) {
    return require(path.resolve(__dirname, '../../frontend/node_modules/yjs'));
  }
}

const Y = resolveYjs();

const COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function normalizeStrokeSignature(stroke) {
  if (!stroke) return '';
  if (stroke.strokeId) return String(stroke.strokeId);
  return JSON.stringify({
    type: stroke.type,
    left: Math.round(Number(stroke.left) || 0),
    top: Math.round(Number(stroke.top) || 0),
    width: Math.round(Number(stroke.width) || 0),
    height: Math.round(Number(stroke.height) || 0),
    radius: Math.round(Number(stroke.radius) || 0),
    stroke: stroke.stroke
  });
}

exports.createClientModels = (count = 4) =>
  Array.from({ length: count }, (_, idx) => {
    const ydoc = new Y.Doc();
    ydoc.clientID = 1000 + idx + 1;
    return {
      clientIndex: idx + 1,
      ydoc,
      whiteboard: []
    };
  });

exports.buildFabricStroke = (clientIndex, stepIndex) => {
  const strokeId = `c${clientIndex}-s${stepIndex}`;
  const color = COLORS[(clientIndex + stepIndex) % COLORS.length];
  const shapeSelector = stepIndex % 3;

  if (shapeSelector === 1) {
    return {
      type: 'rect',
      version: '5.3.0',
      strokeId,
      left: 80 + clientIndex * 30 + stepIndex * 6,
      top: 90 + stepIndex * 5,
      width: 110,
      height: 75,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 3
    };
  }

  if (shapeSelector === 2) {
    return {
      type: 'circle',
      version: '5.3.0',
      strokeId,
      left: 140 + clientIndex * 25 + stepIndex * 4,
      top: 130 + stepIndex * 4,
      radius: 45,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 3
    };
  }

  return {
    type: 'path',
    version: '5.3.0',
    strokeId,
    left: 60 + clientIndex * 20 + stepIndex * 5,
    top: 75 + stepIndex * 3,
    width: 95,
    height: 50,
    fill: null,
    stroke: color,
    strokeWidth: 3,
    path: [
      ['M', 10 + stepIndex, 15],
      ['Q', 45, 35 + clientIndex * 4, 80, 50],
      ['L', 105, 65]
    ]
  };
};

exports.applyLocalCodeEdit = (model, snippetText) => {
  const ytext = model.ydoc.getText('monaco');
  model.ydoc.transact(() => {
    ytext.insert(ytext.length, snippetText);
  }, `client-${model.clientIndex}`);

  const updateUint8 = Y.encodeStateAsUpdate(model.ydoc);
  return Array.from(updateUint8);
};

exports.applyRemoteCodeUpdate = (model, rawUpdate) => {
  if (!rawUpdate || !model?.ydoc) return;
  const byteArray = Array.isArray(rawUpdate) ? rawUpdate : Object.values(rawUpdate);
  Y.applyUpdate(model.ydoc, new Uint8Array(byteArray), 'remote');
};

exports.applyStateSyncToModel = (model, snapshot = {}) => {
  if (!model) return;
  if (Array.isArray(snapshot.whiteboard)) {
    const seen = new Set();
    const deduped = [];
    snapshot.whiteboard.forEach((item) => {
      const sig = normalizeStrokeSignature(item);
      if (sig && !seen.has(sig)) {
        seen.add(sig);
        deduped.push(item);
      }
    });
    model.whiteboard = deduped;
  }

  if (Array.isArray(snapshot.yjsState) && snapshot.yjsState.length > 0) {
    Y.applyUpdate(model.ydoc, new Uint8Array(snapshot.yjsState), 'remote');
  }
};

exports.verifyDataConvergence = (models = []) => {
  if (!Array.isArray(models) || models.length === 0) {
    return { converged: false, convergenceRatePercent: 0 };
  }

  const clientSummaries = models.map((m) => {
    const text = m.ydoc.getText('monaco').toString();
    const codeHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
    const strokeSigs = m.whiteboard.map(normalizeStrokeSignature).sort();
    const whiteboardHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(strokeSigs))
      .digest('hex')
      .slice(0, 12);

    return {
      client: `Client #${m.clientIndex}`,
      codeLength: text.length,
      codeHash,
      strokeCount: strokeSigs.length,
      whiteboardHash
    };
  });

  const reference = clientSummaries[0];
  const codeConverged = clientSummaries.every(
    (s) => s.codeHash === reference.codeHash && s.codeLength > 0
  );
  const whiteboardConverged = clientSummaries.every(
    (s) => s.whiteboardHash === reference.whiteboardHash && s.strokeCount > 0
  );

  const matchingClients = clientSummaries.filter(
    (s) => s.codeHash === reference.codeHash && s.whiteboardHash === reference.whiteboardHash
  ).length;

  const convergenceRatePercent = Number(((matchingClients / models.length) * 100).toFixed(2));

  return {
    converged: codeConverged && whiteboardConverged,
    codeConverged,
    whiteboardConverged,
    convergenceRatePercent,
    codeLength: reference.codeLength,
    codeHash: reference.codeHash,
    strokeCount: reference.strokeCount,
    whiteboardHash: reference.whiteboardHash,
    clientSummaries
  };
};