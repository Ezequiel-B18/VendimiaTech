// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";

/**
 * @title VESTASpoke
 * @notice Contrato listener en RSK Testnet y Hedera Testnet.
 *         Recibe certificados del HUB (BSC) via LayerZero y los registra localmente.
 *         No mintea NFTs — es un registro de verificación.
 */
contract VESTASpoke is OApp {

    struct Certificate {
        string bodega;
        string coordenadas;
        string imageHash;
        int256 ndvi;
        int256 ndre;
        int256 ndwi;
        string climateEvent;
        bool isLimitedEdition;
        uint256 originTokenId;
        uint256 receivedAt;
    }

    mapping(uint256 => Certificate) public certificates;
    uint256 public totalReceived;

    event CertificateReceived(
        uint256 indexed tokenId,
        string bodega,
        bool isLimitedEdition,
        uint32 srcEid
    );

    constructor(address _endpoint, address _owner) OApp(_endpoint, _owner) {}

    /**
     * @notice Recibe el mensaje del HUB via LayerZero y registra el certificado.
     */
    function _lzReceive(
        Origin calldata origin,
        bytes32,
        bytes calldata payload,
        address,
        bytes calldata
    ) internal override {
        (
            uint256 tokenId,
            string memory bodega,
            string memory coordenadas,
            string memory imageHash,
            int256 ndvi,
            int256 ndre,
            int256 ndwi,
            string memory climateEvent
        ) = abi.decode(payload, (uint256, string, string, string, int256, int256, int256, string));

        bool limited = bytes(climateEvent).length > 0;

        certificates[tokenId] = Certificate({
            bodega: bodega,
            coordenadas: coordenadas,
            imageHash: imageHash,
            ndvi: ndvi,
            ndre: ndre,
            ndwi: ndwi,
            climateEvent: climateEvent,
            isLimitedEdition: limited,
            originTokenId: tokenId,
            receivedAt: block.timestamp
        });

        totalReceived++;

        emit CertificateReceived(tokenId, bodega, limited, origin.srcEid);
    }

    function getCertificate(uint256 tokenId) public view returns (Certificate memory) {
        return certificates[tokenId];
    }

    /**
     * @notice Verifica si un certificado fue recibido desde el HUB.
     */
    function isVerified(uint256 tokenId) public view returns (bool) {
        return certificates[tokenId].receivedAt > 0;
    }
}
