import { expect } from "chai";
import { ethers, network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Sovereign Estate Smart Contracts", function () {
  let gtc: any;
  let oracle: any;
  let owner: any;
  let updater: any;
  let user1: any;
  let user2: any;

  const INITIAL_SUPPLY = 1_000_000; // 1M GTC

  beforeEach(async function () {
    [owner, updater, user1, user2] = await ethers.getSigners();

    // Deploy GTC
    const GTCFactory = await ethers.getContractFactory("TribalCoinGTC");
    gtc = await GTCFactory.deploy(INITIAL_SUPPLY);
    await gtc.waitForDeployment();

    // Deploy AGLLOracle
    const OracleFactory = await ethers.getContractFactory("AGLLOracle");
    oracle = await OracleFactory.deploy(owner.address, updater.address);
    await oracle.waitForDeployment();
  });

  describe("GTC.sol — Tribal Coin Core Logic", function () {
    it("Should assign total supply to creator upon deployment", async function () {
      const decimals = await gtc.decimals();
      const expectedSupply = BigInt(INITIAL_SUPPLY) * (10n ** BigInt(decimals));
      
      expect(await gtc.totalSupply()).to.equal(expectedSupply);
      expect(await gtc.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("Should allow transfers within single-transfer limit (1,000 GTC)", async function () {
      const decimals = await gtc.decimals();
      const transferAmount = 500n * (10n ** BigInt(decimals));

      await expect(gtc.transfer(user1.address, transferAmount))
        .to.emit(gtc, "Transfer")
        .withArgs(owner.address, user1.address, transferAmount);

      expect(await gtc.balanceOf(user1.address)).to.equal(transferAmount);
    });

    it("Should revert transfers exceeding 1,000 GTC limit", async function () {
      const decimals = await gtc.decimals();
      const oversizedAmount = 1_001n * (10n ** BigInt(decimals));

      await expect(
        gtc.transfer(user1.address, oversizedAmount)
      ).to.be.revertedWith("Transfer too large — coin is for the people.");
    });

    it("Should enforce 2% max balance (whale cap)", async function () {
      const decimals = await gtc.decimals();
      const totalSupply = await gtc.totalSupply();
      const maxAllowed = totalSupply / 50n; // 2%
      const transferAmount = 1000n * (10n ** BigInt(decimals));

      // Attempting to transfer multiple times up to 2% limit
      // Max allowed for 1M supply is 20,000 GTC
      // We send 1,000 GTC 20 times to reach the 2% cap
      for (let i = 0; i < 20; i++) {
        await gtc.transfer(user1.address, transferAmount);
      }

      // 21st transfer should exceed 2%
      await expect(
        gtc.transfer(user1.address, transferAmount)
      ).to.be.revertedWith("No wallet can own more than 2%.");
    });

    it("Should reject dormancy reclamation before 365 days", async function () {
      const decimals = await gtc.decimals();
      const amount = 500n * (10n ** BigInt(decimals));

      await gtc.transfer(user1.address, amount);

      // Attempt to reclaim immediately
      await expect(
        gtc.reclaimDormantCoins(user1.address)
      ).to.be.revertedWith("Wallet is not dormant yet.");
    });

    it("Should allow creator to reclaim coins after 365 days of inactivity", async function () {
      const decimals = await gtc.decimals();
      const amount = 500n * (10n ** BigInt(decimals));

      await gtc.transfer(user1.address, amount);
      expect(await gtc.balanceOf(user1.address)).to.equal(amount);

      // Fast-forward time by 365 days + 1 second
      await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      await expect(gtc.reclaimDormantCoins(user1.address))
        .to.emit(gtc, "DormantCoinsReclaimed")
        .withArgs(user1.address, amount, owner.address);

      expect(await gtc.balanceOf(user1.address)).to.equal(0n);
    });
  });

  describe("AGLLOracle.sol — Resonance Telemetry", function () {
    it("Should allow assigned UPDATER_ROLE to submit pulse and emit event", async function () {
      const T = 80;
      const I = 20;
      const F = 10;
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test-payload"));

      // Score = T - (I/2) - F = 80 - 10 - 10 = 60
      // Scaled resonance = (60 * 10000) / 100 = 6000 (0.6000)
      const expectedResonance = 6000n;

      await expect(oracle.connect(updater).pulseResonance(T, I, F, proofHash))
        .to.emit(oracle, "OraclePulse")
        .withArgs(1n, T, I, F, expectedResonance, proofHash, anyValue);

      const cycleCount = await oracle.cycleCount();
      expect(cycleCount).to.equal(1n);

      const resData = await oracle.resonances(1);
      expect(resData.resonance).to.equal(expectedResonance);
    });

    it("Should revert pulse submission from unauthorized accounts", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("unauthorized"));

      await expect(
        oracle.connect(user1).pulseResonance(50, 10, 10, proofHash)
      ).to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
    });

    it("Should revert if T + I + F > 300", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("invalid-sum"));

      await expect(
        oracle.connect(updater).pulseResonance(150, 100, 51, proofHash)
      ).to.be.revertedWith("Invalid T/I/F parameters");
    });
  });
});
