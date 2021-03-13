pragma solidity 0.6.5;

interface IAlohaNFT {
    function awardItem(
        address wallet,
        uint256 tokenImage,
        uint256 tokenRarity,
        uint256 tokenBackground
    ) external returns (uint256);

    function tokenRarity(uint256 tokenId) external view returns (uint256);
}