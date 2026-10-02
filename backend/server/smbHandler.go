package main

import (
	"errors"
	iofs "io/fs"
	"net"
	"strings"

	"github.com/hirochachacha/go-smb2"
)

type User struct {
	serverName   string
	serverIP     string
	userName     string
	userPassword string
}

func connectSMBserver(user User) (*smb2.Session, net.Conn, error) {
	// connect to SMB server
	conn, err := net.Dial("tcp", user.serverIP+":445")
	if err != nil {
		return nil, nil, errors.New("SMB Server Konfiguration fehlerhaft")
	}
	d := &smb2.Dialer{
		Initiator: &smb2.NTLMInitiator{
			User:     user.userName,
			Password: user.userPassword,
		},
	}
	s, err := d.Dial(conn)
	if err != nil {
		return nil, nil, errors.New("SMB Server Benutzer oder Passwort fehlerhaft")
	}
	return s, conn, nil
}

func getMount(s *smb2.Session, shareName string) *smb2.Share {
	// connect to share
	m, err := s.Mount(shareName)
	if err != nil {
		panic(err)
	}
	return m
}
func readFile(fs *smb2.Share, fileName string) []byte {
	fileBytes, err := fs.ReadFile(fileName)
	if err != nil {
		panic(err)
	}
	return fileBytes
}

func getAllImageNames(fs *smb2.Share) []string {
	var imageNames []string
	err := iofs.WalkDir(fs.DirFS("."), ".", func(path string, d iofs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil // skip directories
		}
		// Check if the file has an image extension
		if strings.HasSuffix(path, ".jpg") || strings.HasSuffix(path, ".jpeg") ||
			strings.HasSuffix(path, ".png") || strings.HasSuffix(path, ".gif") ||
			strings.HasSuffix(path, ".JPG") || strings.HasSuffix(path, ".JPEG") ||
			strings.HasSuffix(path, ".bmp") || strings.HasSuffix(path, ".tiff") {
			imageNames = append(imageNames, path)

		}
		return nil
	})
	if err != nil {
		panic(err)
	}

	return imageNames
}
