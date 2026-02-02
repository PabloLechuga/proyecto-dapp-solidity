// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

interface IUserRegistry {
    function isArtist(address _address) external view returns (bool);
}

contract TicketNFT is ERC721URIStorage, Ownable, IERC2981 {
    uint256 private _tokenIds;
    IUserRegistry public userRegistry;

    struct RoyaltyInfo {
        address receiver;
        uint96 royaltyFraction;
    }

    mapping(uint256 => RoyaltyInfo) private _royalties;

    constructor(
        string memory name,
        string memory symbol,
        address _userRegistry
    ) ERC721(name, symbol) {
        userRegistry = IUserRegistry(_userRegistry);
    }

    modifier onlyArtist() {
        require(userRegistry.isArtist(msg.sender), "Caller is not an artist");
        _;
    }

    function mint(
        address to,
        string memory tokenURI,
        address royaltyReceiver,
        uint96 royaltyBips
    ) external onlyArtist returns (uint256) {
        require(royaltyBips <= 10000, "Max royalty is 100%");
        
        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _mint(to, newItemId);
        _setTokenURI(newItemId, tokenURI);

        _royalties[newItemId] = RoyaltyInfo(royaltyReceiver, royaltyBips);

        return newItemId;
    }

    function batchMint(
        address to,
        uint256 quantity,
        string memory sharedURI,
        address royaltyReceiver,
        uint96 royaltyBips
    ) external onlyArtist {
        require(royaltyBips <= 10000, "Max royalty is 100%");

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIds++;
            uint256 newItemId = _tokenIds;

            _mint(to, newItemId);
            _setTokenURI(newItemId, sharedURI);

            _royalties[newItemId] = RoyaltyInfo(royaltyReceiver, royaltyBips);
        }
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }

    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (address, uint256) {
        RoyaltyInfo memory info = _royalties[tokenId];
        uint256 royaltyAmount = (salePrice * info.royaltyFraction) / 10000;
        return (info.receiver, royaltyAmount);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721URIStorage, IERC165) returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
