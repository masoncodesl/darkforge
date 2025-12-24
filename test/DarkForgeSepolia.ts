import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { DarkForge } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("DarkForgeSepolia", function () {
  let signers: Signers;
  let darkForgeContract: DarkForge;
  let darkForgeContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const darkForgeDeployment = await deployments.get("DarkForge");
      darkForgeContractAddress = darkForgeDeployment.address;
      darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("mints a soldier and earns points", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    progress(`Call DarkForge.mintSoldier()...`);
    let tx = await darkForgeContract.connect(signers.alice).mintSoldier();
    await tx.wait();

    progress(`Fetch token ids...`);
    const tokenIds = await darkForgeContract.getSoldierIds(signers.alice.address);
    expect(tokenIds.length).to.be.greaterThan(0);

    progress(`Read encrypted stats...`);
    const [attackHandle, defenseHandle] = await darkForgeContract.getSoldierStats(tokenIds[0]);
    expect(attackHandle).to.not.eq(ethers.ZeroHash);
    expect(defenseHandle).to.not.eq(ethers.ZeroHash);

    progress(`Decrypt attack...`);
    const attack = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      attackHandle,
      darkForgeContractAddress,
      signers.alice,
    );
    progress(`Decrypt defense...`);
    const defense = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      defenseHandle,
      darkForgeContractAddress,
      signers.alice,
    );

    expect(attack).to.be.greaterThanOrEqual(10);
    expect(defense).to.be.greaterThanOrEqual(10);

    progress(`Call attackMonster(${tokenIds[0]})...`);
    tx = await darkForgeContract.connect(signers.alice).attackMonster(tokenIds[0]);
    await tx.wait();

    progress(`Decrypt points...`);
    const pointsHandle = await darkForgeContract.getPoints(signers.alice.address);
    const points = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      pointsHandle,
      darkForgeContractAddress,
      signers.alice,
    );
    progress(`Clear points: ${points}`);

    expect(points).to.be.greaterThan(0);
  });
});
