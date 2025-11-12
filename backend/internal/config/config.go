package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Address string
	}
	Database struct {
		Driver   string
		DSN      string
		Host     string
		Port     int
		User     string
		Password string
		DBName   string
	}
	MaxAPI struct {
		BaseURL     string
		AccessToken string
		BotToken    string
	}
	App struct {
		JWTSecret      string
		JWTTTL         int // в секундах
		RefreshTTL     int // в секундах
		WebSocketPath  string
		MaxSessionSize int
	}
}

func New() *Config {

	return &Config{}
}

func (c *Config) Load(filePath string) error {

	c.SetDefaults()

	viper.SetConfigFile(filePath)
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Читаем переменные окружения напрямую (для Docker)
	viper.BindEnv("DB_DSN")
	viper.BindEnv("DATABASE.DSN", "DB_DSN")
	viper.BindEnv("MAXAPI.BOT_TOKEN", "BOT_TOKEN")

	err := viper.ReadInConfig()
	if err != nil {
		return fmt.Errorf("failed to read config file: %v", err)
	}

	// Маппинг настроек
	if viper.IsSet("SERVER.ADDRESS") {
		c.Server.Address = viper.GetString("SERVER.ADDRESS")
	}

	// Database settings
	if viper.IsSet("DATABASE.DRIVER") {
		c.Database.Driver = viper.GetString("DATABASE.DRIVER")
	}
	if viper.IsSet("DATABASE.DSN") {
		c.Database.DSN = viper.GetString("DATABASE.DSN")
	}
	if viper.IsSet("DATABASE.HOST") {
		c.Database.Host = viper.GetString("DATABASE.HOST")
	}
	if viper.IsSet("DATABASE.PORT") {
		c.Database.Port = viper.GetInt("DATABASE.PORT")
	}
	if viper.IsSet("DATABASE.USER") {
		c.Database.User = viper.GetString("DATABASE.USER")
	}
	if viper.IsSet("DATABASE.PASSWORD") {
		c.Database.Password = viper.GetString("DATABASE.PASSWORD")
	}
	if viper.IsSet("DATABASE.DB_NAME") {
		c.Database.DBName = viper.GetString("DATABASE.DB_NAME")
	}

	if viper.IsSet("MAXAPI.BASE_URL") {
		c.MaxAPI.BaseURL = viper.GetString("MAXAPI.BASE_URL")
	}
	if viper.IsSet("MAXAPI.ACCESS_TOKEN") {
		c.MaxAPI.AccessToken = viper.GetString("MAXAPI.ACCESS_TOKEN")
	}
	// Читаем BOT_TOKEN из конфига (будет перезаписан переменной окружения, если она есть)
	if botToken := viper.GetString("MAXAPI.BOT_TOKEN"); botToken != "" {
		c.MaxAPI.BotToken = botToken
	}
	if viper.IsSet("APP.JWT_SECRET") {
		c.App.JWTSecret = viper.GetString("APP.JWT_SECRET")
	}
	if viper.IsSet("APP.JWT_TTL") {
		c.App.JWTTTL = viper.GetInt("APP.JWT_TTL")
	}
	if viper.IsSet("APP.REFRESH_TTL") {
		c.App.RefreshTTL = viper.GetInt("APP.REFRESH_TTL")
	}
	if viper.IsSet("APP.WEBSOCKET_PATH") {
		c.App.WebSocketPath = viper.GetString("APP.WEBSOCKET_PATH")
	}
	if viper.IsSet("APP.MAX_SESSION_SIZE") {
		c.App.MaxSessionSize = viper.GetInt("APP.MAX_SESSION_SIZE")
	}

	// Проверяем переменную окружения DB_DSN (приоритет над config.toml)
	if envDSN := viper.GetString("DB_DSN"); envDSN != "" {
		c.Database.DSN = envDSN
	}

	// Проверяем переменную окружения BOT_TOKEN (приоритет над config.toml)
	if envBotToken := viper.GetString("BOT_TOKEN"); envBotToken != "" {
		c.MaxAPI.BotToken = envBotToken
	}

	// Строим DSN из отдельных параметров, если DSN не указан
	if c.Database.DSN == "" && c.Database.Host != "" {
		c.Database.DSN = c.BuildDSN()
	}

	return nil
}

// BuildDSN строит строку подключения к БД из отдельных параметров
func (c *Config) BuildDSN() string {
	if c.Database.DSN != "" {
		return c.Database.DSN
	}

	// Формат: postgres://user:password@host:port/dbname?sslmode=disable
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable",
		c.Database.User,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.DBName,
	)
	return dsn
}
