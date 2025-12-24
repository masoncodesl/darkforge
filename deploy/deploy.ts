import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDarkForge = await deploy("DarkForge", {
    from: deployer,
    log: true,
  });

  console.log(`DarkForge contract: `, deployedDarkForge.address);
};
export default func;
func.id = "deploy_darkForge"; // id required to prevent reexecution
func.tags = ["DarkForge"];
