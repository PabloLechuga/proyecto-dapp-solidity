// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UserRegistry is Ownable {
    
    enum UserRole { USER, ARTIST }
    
    struct UserProfile {
        UserRole role;
        bool isRegistered;
    }
    
    mapping(address => UserProfile) public users;
    address[] public artistAddresses;
    
    event UserRegistered(address indexed userAddress, UserRole role);
    event ArtistAdded(address indexed artistAddress);
    event ArtistRemoved(address indexed artistAddress);
    
    constructor() {}
    
    function registerUser() external {
        require(!users[msg.sender].isRegistered, "User already registered");
        
        users[msg.sender] = UserProfile({
            role: UserRole.USER,
            isRegistered: true
        });
        
        emit UserRegistered(msg.sender, UserRole.USER);
    }
    
    function registerArtist(address _artistAddress) external onlyOwner {
        require(_artistAddress != address(0), "Invalid address");
        
        if (!users[_artistAddress].isRegistered) {
            users[_artistAddress] = UserProfile({
                role: UserRole.ARTIST,
                isRegistered: true
            });
            artistAddresses.push(_artistAddress);
            emit UserRegistered(_artistAddress, UserRole.ARTIST);
        } else {
            users[_artistAddress].role = UserRole.ARTIST;
            artistAddresses.push(_artistAddress);
        }
        
        emit ArtistAdded(_artistAddress);
    }
    
    function removeArtist(address _artistAddress) external onlyOwner {
        require(users[_artistAddress].role == UserRole.ARTIST, "User is not an artist");
        
        users[_artistAddress].role = UserRole.USER;
        
        for (uint i = 0; i < artistAddresses.length; i++) {
            if (artistAddresses[i] == _artistAddress) {
                artistAddresses[i] = artistAddresses[artistAddresses.length - 1];
                artistAddresses.pop();
                break;
            }
        }
        
        emit ArtistRemoved(_artistAddress);
    }
    
    function isArtist(address _address) external view returns (bool) {
        return users[_address].isRegistered && users[_address].role == UserRole.ARTIST;
    }
    
    function isRegistered(address _address) external view returns (bool) {
        return users[_address].isRegistered;
    }
    
    function getUserProfile(address _address) external view returns (UserRole role, bool registered) {
        UserProfile memory profile = users[_address];
        return (profile.role, profile.isRegistered);
    }
    
    function getAllArtists() external view returns (address[] memory) {
        return artistAddresses;
    }
    
    function getArtistCount() external view returns (uint) {
        return artistAddresses.length;
    }
}
