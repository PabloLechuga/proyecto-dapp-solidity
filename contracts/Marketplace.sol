// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract Marketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;

    event TicketListed(address indexed nft, uint256 indexed tokenId, address seller, uint256 price);
    event TicketBought(address indexed nft, uint256 indexed tokenId, address buyer, uint256 price);
    event ListingCancelled(address indexed nft, uint256 indexed tokenId);

    function listTicket(address nft, uint256 tokenId, uint256 price) external {
        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(token.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        require(price > 0, "Invalid price");

        listings[nft][tokenId] = Listing(msg.sender, price);

        emit TicketListed(nft, tokenId, msg.sender, price);
    }

    function cancelListing(address nft, uint256 tokenId) external {
        Listing memory item = listings[nft][tokenId];
        require(item.seller == msg.sender, "Not authorized");

        delete listings[nft][tokenId];

        emit ListingCancelled(nft, tokenId);
    }

    function buyTicket(address nft, uint256 tokenId) external payable nonReentrant {
        Listing memory item = listings[nft][tokenId];
        require(item.price > 0, "Ticket not for sale");
        require(msg.value >= item.price, "Insufficient funds");

        (address artist, uint256 royaltyAmount) = IERC2981(nft).royaltyInfo(tokenId, item.price);
        uint256 sellerAmount = item.price - royaltyAmount;

        payable(item.seller).transfer(sellerAmount);
        if (royaltyAmount > 0) {
            payable(artist).transfer(royaltyAmount);
        }

        IERC721(nft).safeTransferFrom(item.seller, msg.sender, tokenId);

        delete listings[nft][tokenId];

        emit TicketBought(nft, tokenId, msg.sender, item.price);
    }
}
