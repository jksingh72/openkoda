cd openkoda
mvn spring-boot:run -Dspring.datasource.password=postgres \
  -Dspring-boot.run.jvmArguments="--add-opens=java.base/java.lang=ALL-UNNAMED"
