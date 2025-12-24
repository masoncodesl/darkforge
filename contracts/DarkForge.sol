// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title DarkForge
/// @notice Mint encrypted Soldier NFTs and earn encrypted points by fighting monsters.
contract DarkForge is ZamaEthereumConfig {
    struct Soldier {
        euint32 attack;
        euint32 defense;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 => Soldier) private _soldiers;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256[]) private _ownedTokens;
    mapping(address => euint32) private _points;

    event SoldierMinted(address indexed owner, uint256 indexed tokenId);
    event MonsterAttacked(address indexed player, uint256 indexed tokenId, euint32 reward);

    /// @notice Mint a Soldier NFT with randomized encrypted stats.
    /// @return tokenId The newly minted token id.
    function mintSoldier() external returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId += 1;

        euint32 attack = FHE.add(FHE.randEuint32(91), FHE.asEuint32(10));
        euint32 defense = FHE.add(FHE.randEuint32(91), FHE.asEuint32(10));

        _soldiers[tokenId] = Soldier({attack: attack, defense: defense});
        _owners[tokenId] = msg.sender;
        _ownedTokens[msg.sender].push(tokenId);

        FHE.allowThis(attack);
        FHE.allowThis(defense);
        FHE.allow(attack, msg.sender);
        FHE.allow(defense, msg.sender);

        emit SoldierMinted(msg.sender, tokenId);
    }

    /// @notice Returns the owner of a token.
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token not minted");
        return owner;
    }

    /// @notice Returns the number of tokens owned by an address.
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _ownedTokens[owner].length;
    }

    /// @notice Returns the list of token ids owned by an address.
    function getSoldierIds(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    /// @notice Returns encrypted stats for a given Soldier.
    function getSoldierStats(uint256 tokenId) external view returns (euint32 attack, euint32 defense) {
        _requireMinted(tokenId);
        Soldier storage soldier = _soldiers[tokenId];
        return (soldier.attack, soldier.defense);
    }

    /// @notice Returns the encrypted points for a player.
    function getPoints(address player) external view returns (euint32) {
        return _points[player];
    }

    /// @notice Attack a monster to earn encrypted points.
    function attackMonster(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        Soldier storage soldier = _soldiers[tokenId];
        euint32 power = FHE.add(soldier.attack, soldier.defense);
        euint32 reward = FHE.add(FHE.div(power, 2), FHE.randEuint32(25));

        _points[msg.sender] = FHE.add(_points[msg.sender], reward);
        FHE.allowThis(_points[msg.sender]);
        FHE.allow(_points[msg.sender], msg.sender);

        emit MonsterAttacked(msg.sender, tokenId, reward);
    }

    function _requireMinted(uint256 tokenId) internal view {
        require(_owners[tokenId] != address(0), "Token not minted");
    }
}
