pragma solidity 0.6.5;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AlohaNFTMock is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping (uint256 => uint256) private _tokenImages;
    mapping (uint256 => uint256) private _tokenRarities;
    mapping (uint256 => uint256) private _tokenBackgrounds;

    constructor() public ERC721('Aloha NFT', 'ANFT') {
        _setBaseURI('http://aloha.com/');
    }

    /**
    * @dev Mints a new ALOHA NFT for a wallet.
    */
    function awardItem(
        address wallet,
        uint256 tokenImage,
        uint256 tokenRarity,
        uint256 tokenBackground
    )
        public
        onlyOwner()
        returns (uint256)
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(wallet, newItemId);
        _setTokenImage(newItemId, tokenImage);
        _setTokenRarity(newItemId, tokenRarity);
        _setTokenBackground(newItemId, tokenBackground);

        return newItemId;
    }

    function _setTokenImage(uint256 tokenId, uint256 _tokenImage) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: Image set of nonexistent token");
        _tokenImages[tokenId] = _tokenImage;
    }

    function _setTokenRarity(uint256 tokenId, uint256 _tokenRarity) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: Rarity set of nonexistent token");
        _tokenRarities[tokenId] = _tokenRarity;
    }

    function _setTokenBackground(uint256 tokenId, uint256 _tokenBackground) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: Background set of nonexistent token");
        _tokenBackgrounds[tokenId] = _tokenBackground;
    }

    function tokenRarity(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "ERC721Metadata: Rarity query for nonexistent token");
        return _tokenRarities[tokenId];
    }
}