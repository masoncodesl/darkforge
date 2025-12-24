import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { DarkForge, DarkForge__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("DarkForge")) as DarkForge__factory;
  const darkForgeContract = (await factory.deploy()) as DarkForge;
  const darkForgeContractAddress = await darkForgeContract.getAddress();

  return { darkForgeContract, darkForgeContractAddress };
}

describe("DarkForge", function () {
  let signers: Signers;
  let darkForgeContract: DarkForge;
  let darkForgeContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ darkForgeContract, darkForgeContractAddress } = await deployFixture());
  });

  it("mints a soldier with stats in range", async function () {
    const tx = await darkForgeContract.connect(signers.alice).mintSoldier();
    await tx.wait();

    const tokenIds = await darkForgeContract.getSoldierIds(signers.alice.address);
    expect(tokenIds.length).to.eq(1);

    const [attackHandle, defenseHandle] = await darkForgeContract.getSoldierStats(tokenIds[0]);
    const attack = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      attackHandle,
      darkForgeContractAddress,
      signers.alice,
    );
    const defense = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      defenseHandle,
      darkForgeContractAddress,
      signers.alice,
    );

    expect(attack).to.be.greaterThanOrEqual(10);
    expect(attack).to.be.lessThanOrEqual(100);
    expect(defense).to.be.greaterThanOrEqual(10);
    expect(defense).to.be.lessThanOrEqual(100);
  });

  it("earns encrypted points after attacking a monster", async function () {
    const mintTx = await darkForgeContract.connect(signers.alice).mintSoldier();
    await mintTx.wait();

    const tokenIds = await darkForgeContract.getSoldierIds(signers.alice.address);
    const tokenId = tokenIds[0];

    const attackTx = await darkForgeContract.connect(signers.alice).attackMonster(tokenId);
    await attackTx.wait();

    const pointsHandle = await darkForgeContract.getPoints(signers.alice.address);
    const points = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      pointsHandle,
      darkForgeContractAddress,
      signers.alice,
    );

    expect(points).to.be.greaterThan(0);
  });
});
