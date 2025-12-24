import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the DarkForge address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const darkForge = await deployments.get("DarkForge");

  console.log("DarkForge address is " + darkForge.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:mint-soldier
 *   - npx hardhat --network sepolia task:mint-soldier
 */
task("task:mint-soldier", "Mints a Soldier NFT")
  .addOptionalParam("address", "Optionally specify the DarkForge contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const darkForgeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("DarkForge");
    console.log(`DarkForge: ${darkForgeDeployment.address}`);

    const signers = await ethers.getSigners();
    const darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);

    const tx = await darkForgeContract.connect(signers[0]).mintSoldier();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:list-soldiers --owner <address>
 */
task("task:list-soldiers", "Lists Soldier token ids for an owner")
  .addParam("owner", "Owner address")
  .addOptionalParam("address", "Optionally specify the DarkForge contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const darkForgeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("DarkForge");

    const darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);
    const tokens = await darkForgeContract.getSoldierIds(taskArguments.owner);
    console.log(`Soldiers for ${taskArguments.owner}: ${tokens.join(", ")}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-soldier --token-id 1
 */
task("task:decrypt-soldier", "Decrypts Soldier stats for a token")
  .addParam("tokenId", "Soldier token id")
  .addOptionalParam("address", "Optionally specify the DarkForge contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const tokenId = parseInt(taskArguments.tokenId);
    if (!Number.isInteger(tokenId)) {
      throw new Error(`Argument --token-id is not an integer`);
    }

    const darkForgeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("DarkForge");

    const signers = await ethers.getSigners();
    const darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);

    const [attackHandle, defenseHandle] = await darkForgeContract.getSoldierStats(tokenId);
    console.log(`Encrypted attack: ${attackHandle}`);
    console.log(`Encrypted defense: ${defenseHandle}`);

    const attack = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      attackHandle,
      darkForgeDeployment.address,
      signers[0],
    );
    const defense = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      defenseHandle,
      darkForgeDeployment.address,
      signers[0],
    );

    console.log(`Clear attack  : ${attack}`);
    console.log(`Clear defense : ${defense}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:attack --token-id 1
 */
task("task:attack", "Attacks a monster to earn points")
  .addParam("tokenId", "Soldier token id")
  .addOptionalParam("address", "Optionally specify the DarkForge contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const tokenId = parseInt(taskArguments.tokenId);
    if (!Number.isInteger(tokenId)) {
      throw new Error(`Argument --token-id is not an integer`);
    }

    const darkForgeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("DarkForge");

    const signers = await ethers.getSigners();
    const darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);

    const tx = await darkForgeContract.connect(signers[0]).attackMonster(tokenId);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-points --player <address>
 */
task("task:decrypt-points", "Decrypts encrypted points for a player")
  .addParam("player", "Player address")
  .addOptionalParam("address", "Optionally specify the DarkForge contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const darkForgeDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("DarkForge");

    const signers = await ethers.getSigners();
    const darkForgeContract = await ethers.getContractAt("DarkForge", darkForgeDeployment.address);

    const encryptedPoints = await darkForgeContract.getPoints(taskArguments.player);
    if (encryptedPoints === ethers.ZeroHash) {
      console.log(`Encrypted points: ${encryptedPoints}`);
      console.log("Clear points    : 0");
      return;
    }

    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      darkForgeDeployment.address,
      signers[0],
    );

    console.log(`Encrypted points: ${encryptedPoints}`);
    console.log(`Clear points    : ${clearPoints}`);
  });
