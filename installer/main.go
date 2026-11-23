// Deltacord installer for Windows: downloads the latest Deltacord build and patches Discord to load it,
// using Equicord's installer (Equilotl) in dev-install mode so it loads Deltacord instead of Equicord.
package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	asarURL      = "https://github.com/Narehatechi/deltacord-pc/releases/download/latest/desktop.asar"
	equilotlURL  = "https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli.exe"
	userAgent    = "Deltacord-Installer"
	discordProcs = "Discord.exe,DiscordPTB.exe,DiscordCanary.exe"
)

var in = bufio.NewReader(os.Stdin)

func main() {
	fmt.Println()
	fmt.Println("  * DELTACORD")
	fmt.Println("  * A Discord mod, now on your PC.")
	fmt.Println()

	dataDir := filepath.Join(os.Getenv("APPDATA"), "Deltacord")
	asar := filepath.Join(dataDir, "deltacord.asar")
	equilotl := filepath.Join(dataDir, "installer", "EquilotlCli.exe")

	fmt.Println("  Press Enter to install or update Deltacord.")
	fmt.Println("  Type U and press Enter to uninstall it.")
	fmt.Print("  > ")
	choice, _ := in.ReadString('\n')
	uninstall := strings.EqualFold(strings.TrimSpace(choice), "u")

	var err error
	if uninstall {
		err = run(dataDir, asar, equilotl, "-uninstall")
	} else {
		err = install(dataDir, asar, equilotl)
	}

	fmt.Println()
	if err != nil {
		fmt.Println("  Something went wrong:", err)
		fmt.Println("  Make sure Discord is installed and you're online, then try again.")
	} else if uninstall {
		fmt.Println("  * Deltacord was removed. Discord is back to normal.")
		startDiscord()
	} else {
		fmt.Println("  * Deltacord is installed. You are filled with DETERMINATION.")
		startDiscord()
	}
	fmt.Println()
	fmt.Print("  Press Enter to close.")
	in.ReadString('\n')
}

func install(dataDir, asar, equilotl string) error {
	closeDiscord()

	step("Downloading Deltacord")
	if err := download(asarURL, asar); err != nil {
		return err
	}
	return run(dataDir, asar, equilotl, "-install")
}

func run(dataDir, asar, equilotl, action string) error {
	closeDiscord()

	step("Getting the Discord patcher")
	if err := download(equilotlURL, equilotl); err != nil {
		return err
	}

	step("Patching Discord")
	cmd := exec.Command(equilotl, action, "-branch", "auto")
	cmd.Stdout, cmd.Stderr = os.Stdout, os.Stderr
	cmd.Env = append(os.Environ(),
		"EQUICORD_DEV_INSTALL=1",
		"EQUICORD_DIRECTORY="+asar,
		"EQUICORD_USER_DATA_DIR="+dataDir,
	)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("the patcher failed (%w)", err)
	}
	return nil
}

func download(url, dest string) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", userAgent)
	res, err := (&http.Client{Timeout: 5 * time.Minute}).Do(req)
	if err != nil {
		return fmt.Errorf("couldn't download %s (%w)", filepath.Base(dest), err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("couldn't download %s (%s)", filepath.Base(dest), res.Status)
	}

	tmp := dest + ".download"
	out, err := os.Create(tmp)
	if err != nil {
		return err
	}
	n, err := io.Copy(out, res.Body)
	out.Close()
	if err == nil && res.ContentLength > 0 && n != res.ContentLength {
		err = fmt.Errorf("the download of %s was cut short", filepath.Base(dest))
	}
	if err != nil {
		os.Remove(tmp)
		return err
	}
	os.Remove(dest)
	return os.Rename(tmp, dest)
}

func closeDiscord() {
	for _, p := range strings.Split(discordProcs, ",") {
		exec.Command("taskkill", "/F", "/IM", p).Run()
	}
	time.Sleep(1500 * time.Millisecond)
}

func startDiscord() {
	update := filepath.Join(os.Getenv("LOCALAPPDATA"), "Discord", "Update.exe")
	if _, err := os.Stat(update); err == nil {
		exec.Command(update, "--processStart", "Discord.exe").Start()
	}
}

func step(text string) {
	fmt.Println("  * " + text + "...")
}
