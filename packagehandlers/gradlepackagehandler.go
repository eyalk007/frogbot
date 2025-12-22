package packagehandlers

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"

	"github.com/jfrog/frogbot/v2/utils"
	"github.com/jfrog/jfrog-cli-core/v2/utils/config"
	"github.com/jfrog/jfrog-client-go/utils/log"
)

const (
	apostrophes                   = "[\\\"|\\']"
	directMapRegexpEntry          = "\\s*%s\\s*[:|=]\\s*"
	directStringWithVersionFormat = "%s:%s:%s"
)

var directMapWithVersionRegexp = getMapRegexpEntry("group") + "," + getMapRegexpEntry("name") + "," + getMapRegexpEntry("version")

func getMapRegexpEntry(mapEntry string) string {
	return fmt.Sprintf(directMapRegexpEntry, mapEntry) + apostrophes + "%s" + apostrophes
}

type GradlePackageUpdater struct {
	serverDetails *config.ServerDetails
	depsRepo      string
}

func (gpu *GradlePackageUpdater) SetCommonParams(serverDetails *config.ServerDetails, depsRepo string) {
	gpu.serverDetails = serverDetails
	gpu.depsRepo = depsRepo
}

func (gpu *GradlePackageUpdater) UpdateDependency(vulnDetails *utils.VulnerabilityDetails) error {
	if !vulnDetails.IsDirectDependency {
		return &utils.ErrUnsupportedFix{
			PackageName:  vulnDetails.ImpactedDependencyName,
			FixedVersion: vulnDetails.SuggestedFixedVersion,
			ErrorType:    utils.IndirectDependencyFixNotSupported,
		}
	}

	if err := gpu.updateDependency(vulnDetails); err != nil {
		return err
	}

	if err := gpu.updateLockfile(); err != nil {
		log.Warn("Failed to update gradle.lockfile:", err)
	}
	return nil
}

func (gpu *GradlePackageUpdater) updateDependency(vulnDetails *utils.VulnerabilityDetails) error {
	descriptorPath := vulnDetails.Descriptor

	byteFileContent, err := os.ReadFile(descriptorPath)
	if err != nil {
		return fmt.Errorf("couldn't read file '%s': %s", descriptorPath, err.Error())
	}
	fileContent := string(byteFileContent)
	originalFile := fileContent

	depGroup, depName, err := getVulnerabilityGroupAndName(vulnDetails.ImpactedDependencyName)
	if err != nil {
		return err
	}

	directStringVulnerableRow := fmt.Sprintf(directStringWithVersionFormat, depGroup, depName, vulnDetails.ImpactedDependencyVersion)
	directStringFixedRow := fmt.Sprintf(directStringWithVersionFormat, depGroup, depName, vulnDetails.SuggestedFixedVersion)
	fileContent = strings.ReplaceAll(fileContent, directStringVulnerableRow, directStringFixedRow)

	regexpAdjustedDepGroup := strings.ReplaceAll(depGroup, ".", "\\.")
	regexpAdjustedDepName := strings.ReplaceAll(depName, ".", "\\.")
	dynamicVersionPattern := fmt.Sprintf(`(%s:%s:)[^"'\s]+`, regexpAdjustedDepGroup, regexpAdjustedDepName)
	dynamicVersionRegexp := regexp.MustCompile(dynamicVersionPattern)
	fileContent = dynamicVersionRegexp.ReplaceAllString(fileContent, "${1}"+vulnDetails.SuggestedFixedVersion)

	regexpAdjustedImpactedVersion := strings.ReplaceAll(vulnDetails.ImpactedDependencyVersion, ".", "\\.")
	mapRegexpForVulnerability := fmt.Sprintf(directMapWithVersionRegexp, regexpAdjustedDepGroup, regexpAdjustedDepName, regexpAdjustedImpactedVersion)
	regexpCompiler := regexp.MustCompile(mapRegexpForVulnerability)
	if rowsMatches := regexpCompiler.FindAllString(fileContent, -1); rowsMatches != nil {
		for _, entry := range rowsMatches {
			fixedRow := strings.Replace(entry, vulnDetails.ImpactedDependencyVersion, vulnDetails.SuggestedFixedVersion, 1)
			fileContent = strings.ReplaceAll(fileContent, entry, fixedRow)
		}
	}

	mapDynamicPattern := fmt.Sprintf(
		`(group\s*[:|=]\s*%s%s%s\s*,\s*name\s*[:|=]\s*%s%s%s\s*,\s*version\s*[:|=]\s*%s)[^"']+(%s)`,
		apostrophes, regexpAdjustedDepGroup, apostrophes,
		apostrophes, regexpAdjustedDepName, apostrophes,
		apostrophes, apostrophes,
	)
	mapDynamicRegexp := regexp.MustCompile(mapDynamicPattern)
	fileContent = mapDynamicRegexp.ReplaceAllString(fileContent, "${1}"+vulnDetails.SuggestedFixedVersion+"${2}")

	if fileContent == originalFile {
		return fmt.Errorf("impacted package '%s' was not found in %s", vulnDetails.ImpactedDependencyName, descriptorPath)
	}

	return writeUpdatedBuildFile(descriptorPath, fileContent)
}

func (gpu *GradlePackageUpdater) updateLockfile() error {
	if _, err := os.Stat("gradle.lockfile"); os.IsNotExist(err) {
		log.Debug("No gradle.lockfile found, skipping lockfile update")
		return nil
	}

	gradleCmd, err := getGradleCommand()
	if err != nil {
		log.Debug(err.Error())
		return nil
	}

	cmd := exec.Command(gradleCmd, "dependencies", "--write-locks")
	cmd.Env = os.Environ()
	log.Debug(fmt.Sprintf("Running '%s dependencies --write-locks'", gradleCmd))

	//#nosec G204 -- False positive - the subprocess only runs after the user's approval.
	output, err := cmd.CombinedOutput()
	if len(output) > 0 {
		log.Debug(fmt.Sprintf("%s output:\n%s", gradleCmd, string(output)))
	}

	if err != nil {
		return fmt.Errorf("gradle lockfile update failed: %s\n%s", err.Error(), output)
	}
	log.Debug("Successfully updated gradle.lockfile")
	return nil
}

func getGradleCommand() (string, error) {
	var wrapper string
	if runtime.GOOS == "windows" {
		wrapper = "gradlew.bat"
	} else {
		wrapper = "./gradlew"
	}

	if _, err := os.Stat(wrapper); os.IsNotExist(err) {
		return "", fmt.Errorf("gradle wrapper not found: %s", wrapper)
	}
	return wrapper, nil
}

func getVulnerabilityGroupAndName(impactedDependencyName string) (string, string, error) {
	seperatedImpactedDepName := strings.Split(impactedDependencyName, ":")
	if len(seperatedImpactedDepName) != 2 {
		return "", "", fmt.Errorf("unable to parse impacted dependency name '%s'", impactedDependencyName)
	}
	return seperatedImpactedDepName[0], seperatedImpactedDepName[1], nil
}

func writeUpdatedBuildFile(filePath string, fileContent string) error {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("couldn't get file info for file '%s': %s", filePath, err.Error())
	}

	err = os.WriteFile(filePath, []byte(fileContent), fileInfo.Mode())
	if err != nil {
		return fmt.Errorf("couldn't write fixes to file '%s': %q", filePath, err)
	}
	return nil
}
