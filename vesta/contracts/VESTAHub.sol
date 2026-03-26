// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VESTAHub
 * @notice Contrato principal en BSC Testnet.
 *         Mintea certificados ERC-721 y los replica a los spokes via LayerZero.
 */
contract VESTAHub is OApp, ERC721URIStorage {
    using Strings for uint256;
    using OptionsBuilder for bytes;

    uint256 private _tokenIds;

    struct Certificate {
        string bodega;
        string coordenadas;
        uint256 timestamp;
        string imageHash;
        int256 ndvi;
        int256 ndre;
        int256 ndwi;
        string climateEvent;
        bool isLimitedEdition;
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public ownerTokens;

    event CertificateMinted(uint256 indexed tokenId, address indexed owner, string bodega, bool isLimitedEdition);
    event CertificateBridged(uint256 indexed tokenId, uint32 dstEid);

    constructor(address _endpoint, address _owner)
        OApp(_endpoint, _owner)
        ERC721("VESTA Certificate", "VESTA")
        Ownable(_owner)
    {}

    /**
     * @notice Mintea en BSC y notifica a los spokes via LayerZero.
     * @param dstEids Array de LayerZero EIDs destino (ej: [40219, 40285])
     * @param gasLimits Gas a enviar en cada cadena destino (ej: [200000, 200000])
     */
    function mintAndBridge(
        string memory bodega,
        string memory coordenadas,
        string memory imageHash,
        int256 ndvi,
        int256 ndre,
        int256 ndwi,
        string memory climateEvent,
        uint32[] memory dstEids,
        uint128[] memory gasLimits
    ) external payable returns (uint256) {
        require(dstEids.length == gasLimits.length, "VESTAHub: length mismatch");

        _tokenIds++;
        uint256 tokenId = _tokenIds;
        bool limited = bytes(climateEvent).length > 0;

        certificates[tokenId] = Certificate({
            bodega: bodega,
            coordenadas: coordenadas,
            timestamp: block.timestamp,
            imageHash: imageHash,
            ndvi: ndvi,
            ndre: ndre,
            ndwi: ndwi,
            climateEvent: climateEvent,
            isLimitedEdition: limited
        });

        ownerTokens[msg.sender].push(tokenId);
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        emit CertificateMinted(tokenId, msg.sender, bodega, limited);

        // Enviar mensaje a cada spoke via LayerZero
        if (dstEids.length > 0) {
            bytes memory payload = abi.encode(
                tokenId, bodega, coordenadas, imageHash, ndvi, ndre, ndwi, climateEvent
            );

            uint256 feePerChain = msg.value / dstEids.length;

            for (uint256 i = 0; i < dstEids.length; i++) {
                bytes memory options = OptionsBuilder.newOptions()
                    .addExecutorLzReceiveOption(gasLimits[i], 0);

                _lzSend(
                    dstEids[i],
                    payload,
                    options,
                    MessagingFee(feePerChain, 0),
                    payable(msg.sender)
                );

                emit CertificateBridged(tokenId, dstEids[i]);
            }
        }

        return tokenId;
    }

    /**
     * @notice Estima el fee de LayerZero para un bridge a un destino.
     */
    function estimateFee(
        uint32 dstEid,
        uint256 tokenId,
        string memory bodega,
        string memory coordenadas,
        string memory imageHash,
        int256 ndvi, int256 ndre, int256 ndwi,
        string memory climateEvent,
        uint128 gasLimit
    ) external view returns (uint256 nativeFee) {
        bytes memory payload = abi.encode(
            tokenId, bodega, coordenadas, imageHash, ndvi, ndre, ndwi, climateEvent
        );
        bytes memory options = OptionsBuilder.newOptions()
            .addExecutorLzReceiveOption(gasLimit, 0);
        MessagingFee memory fee = _quote(dstEid, payload, options, false);
        return fee.nativeFee;
    }

    function getCertificate(uint256 tokenId) public view returns (Certificate memory) {
        require(_ownerOf(tokenId) != address(0), "VESTAHub: token no existe");
        return certificates[tokenId];
    }

    function getCollectionByOwner(address owner) public view returns (uint256[] memory) {
        return ownerTokens[owner];
    }

    function isLimitedEdition(uint256 tokenId) public view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "VESTAHub: token no existe");
        return certificates[tokenId].isLimitedEdition;
    }

    // HUB no recibe mensajes de otros contratos
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {}

    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        Certificate memory cert = certificates[tokenId];

        string memory name = string(abi.encodePacked(
            cert.isLimitedEdition ? "VESTA Edicion Limitada #" : "VESTA Certificado #",
            tokenId.toString()
        ));

        string memory description = cert.isLimitedEdition
            ? string(abi.encodePacked("Cosecha historica - ", cert.climateEvent, " - ", cert.bodega))
            : string(abi.encodePacked("Certificado de sostenibilidad satelital - ", cert.bodega));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"', description, '",',
            '"bodega":"', cert.bodega, '",',
            '"coordenadas":"', cert.coordenadas, '",',
            '"imageHash":"', cert.imageHash, '",',
            '"climateEvent":"', cert.climateEvent, '",',
            '"isLimitedEdition":', cert.isLimitedEdition ? "true" : "false",
            '}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // Resolución de herencia múltiple
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
