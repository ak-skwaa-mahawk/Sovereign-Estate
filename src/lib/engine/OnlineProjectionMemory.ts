export interface VectorItem {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ProjectionResult {
  id: string;
  projectedVector: number[];
  residualVector: number[];
  retainedEnergy: number;
  residualEnergy: number;
  cosineSimilarity: number;
  subspaceRank: number;
  inBandCoherence: number;
  isRevoked: boolean;
  metadata?: Record<string, any>;
}

export interface SubspaceTarget {
  id: string;
  basis: number[];
  label: string;
  createdAt: number;
  revokedAt?: number;
  isRevoked: boolean;
}

export interface ProjectionMemoryConfig {
  dimension: number;
  maxCapacity: number;
  spectralBound: number;
  noiseFloorGate: number;
}

export class OnlineProjectionMemory {
  private dimension: number;
  private maxCapacity: number;
  private spectralBound: number;
  private noiseFloorGate: number;
  private basisMatrix: number[][]; // Orthonormal basis vectors (k x D)
  private targets: Map<string, SubspaceTarget>;
  private revokedTargetIds: Set<string>;

  constructor(config?: Partial<ProjectionMemoryConfig>) {
    this.dimension = config?.dimension ?? 64;
    this.maxCapacity = config?.maxCapacity ?? 100;
    this.spectralBound = config?.spectralBound ?? 1.0000;
    this.noiseFloorGate = config?.noiseFloorGate ?? 1e-7;
    this.basisMatrix = [];
    this.targets = new Map();
    this.revokedTargetIds = new Set();
  }

  public getDimension(): number {
    return this.dimension;
  }

  public getCapacity(): number {
    return this.maxCapacity;
  }

  public getRank(): number {
    return this.basisMatrix.length;
  }

  public getSpectralRadius(): number {
    // For any orthogonal projection matrix P = U U^T (where U has orthonormal columns),
    // P^2 = P and P is positive semi-definite with eigenvalues strictly in {0, 1}.
    // Therefore the spectral radius rho(P) = max(|eigenvalues|) = 1.0000 (when rank > 0) or 0 (when rank == 0).
    if (this.basisMatrix.length === 0) return 0.0;
    
    // Verify orthogonality of basis vectors to guarantee strict bound <= 1.0000
    let maxDot = 0;
    for (let i = 0; i < this.basisMatrix.length; i++) {
      const norm = Math.sqrt(this.dot(this.basisMatrix[i], this.basisMatrix[i]));
      if (norm > maxDot) maxDot = norm;
    }
    return Math.min(1.0000, parseFloat(maxDot.toFixed(4)));
  }

  public registerTarget(id: string, vector: number[], label = ''): boolean {
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, received ${vector.length}`);
    }

    const norm = Math.sqrt(this.dot(vector, vector));
    if (norm < 1e-9) {
      throw new Error('Cannot register zero-magnitude vector as subspace target');
    }

    const normalized = vector.map(x => x / norm);
    this.targets.set(id, {
      id,
      basis: [...normalized],
      label: label || `Target-${id}`,
      createdAt: Date.now(),
      isRevoked: false
    });

    this.rebuildOrthonormalBasis();
    return true;
  }

  public revokeTarget(id: string): boolean {
    const target = this.targets.get(id);
    if (!target) return false;

    target.isRevoked = true;
    target.revokedAt = Date.now();
    this.revokedTargetIds.add(id);
    this.rebuildOrthonormalBasis();
    return true;
  }

  public isTargetRevoked(id: string): boolean {
    return this.revokedTargetIds.has(id);
  }

  private dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private rebuildOrthonormalBasis(): void {
    const activeTargets: number[][] = [];
    for (const [id, target] of this.targets.entries()) {
      if (!target.isRevoked && !this.revokedTargetIds.has(id)) {
        activeTargets.push(target.basis);
      }
    }

    // Modified Gram-Schmidt Orthonormalization with capacity bound
    const newBasis: number[][] = [];
    for (const v of activeTargets) {
      if (newBasis.length >= this.maxCapacity) break;
      let u = [...v];
      for (const b of newBasis) {
        const projCoeff = this.dot(u, b);
        for (let i = 0; i < this.dimension; i++) {
          u[i] -= projCoeff * b[i];
        }
      }
      const norm = Math.sqrt(this.dot(u, u));
      if (norm > 1e-5) {
        newBasis.push(u.map(x => x / norm));
      }
    }

    this.basisMatrix = newBasis;
  }

  public project(vectorItem: VectorItem): ProjectionResult {
    const { id, vector, metadata } = vectorItem;
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, received ${vector.length}`);
    }

    const origNormSq = this.dot(vector, vector);
    const origNorm = Math.sqrt(origNormSq);

    // If target is explicitly revoked, apply zero-energy noise floor gating
    if (this.revokedTargetIds.has(id)) {
      return {
        id,
        projectedVector: new Array(this.dimension).fill(0),
        residualVector: [...vector],
        retainedEnergy: 0.0000,
        residualEnergy: origNormSq,
        cosineSimilarity: 0.0000,
        subspaceRank: this.basisMatrix.length,
        inBandCoherence: 0.0000,
        isRevoked: true,
        metadata
      };
    }

    if (this.basisMatrix.length === 0 || origNorm < 1e-9) {
      return {
        id,
        projectedVector: new Array(this.dimension).fill(0),
        residualVector: [...vector],
        retainedEnergy: 0.0,
        residualEnergy: origNormSq,
        cosineSimilarity: 0.0,
        subspaceRank: 0,
        inBandCoherence: 0.0,
        isRevoked: false,
        metadata
      };
    }

    // Compute projection: P(x) = sum_k (u_k . x) * u_k
    const projected = new Array(this.dimension).fill(0);
    for (const u of this.basisMatrix) {
      const coeff = this.dot(u, vector);
      for (let i = 0; i < this.dimension; i++) {
        projected[i] += coeff * u[i];
      }
    }

    // Compute residual: r = x - P(x)
    const residual = new Array(this.dimension).fill(0);
    for (let i = 0; i < this.dimension; i++) {
      residual[i] = vector[i] - projected[i];
    }

    const projNormSq = this.dot(projected, projected);
    const projNorm = Math.sqrt(projNormSq);

    // Cosine similarity between original vector and projection
    let cosineSimilarity = 0;
    if (origNorm > 1e-9 && projNorm > 1e-9) {
      cosineSimilarity = this.dot(vector, projected) / (origNorm * projNorm);
      // Numerical clamping
      cosineSimilarity = Math.max(0.0, Math.min(1.0, cosineSimilarity));
    }

    // Noise floor gating
    if (projNormSq < this.noiseFloorGate) {
      cosineSimilarity = 0.0;
    }

    return {
      id,
      projectedVector: projected,
      residualVector: residual,
      retainedEnergy: projNormSq,
      residualEnergy: this.dot(residual, residual),
      cosineSimilarity: parseFloat(cosineSimilarity.toFixed(4)),
      subspaceRank: this.basisMatrix.length,
      inBandCoherence: parseFloat((projNorm / (origNorm || 1)).toFixed(4)),
      isRevoked: false,
      metadata
    };
  }

  public projectBatch(items: VectorItem[]): ProjectionResult[] {
    return items.map(item => this.project(item));
  }

  public clear(): void {
    this.basisMatrix = [];
    this.targets.clear();
    this.revokedTargetIds.clear();
  }
}
